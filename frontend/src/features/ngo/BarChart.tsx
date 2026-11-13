import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { num } from '../../lib/format';
import s from './chart.module.css';

interface Point {
  date: string;
  meals: number;
}

function parseDay(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

const weekday = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short' });
const longDay = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
const isToday = (d: Date) => d.toDateString() === new Date().toDateString();

export function BarChart({ data, hideCaption }: { data: Point[]; hideCaption?: boolean }) {
  const n = data.length;
  const last = Math.max(0, n - 1);
  const [active, setActive] = useState<number | null>(null);
  const [focusIdx, setFocusIdx] = useState(last);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!n) return null;

  const max = Math.max(1, ...data.map((p) => p.meals));
  const total = data.reduce((a, p) => a + p.meals, 0);
  const peak = data.reduce((a, p) => (p.meals > a.meals ? p : a), data[0]!);
  const hi = active ?? last;
  const current = Math.min(focusIdx, last);

  // Roving focus: arrows move between days, Tab leaves the chart
  const onKeyDown = (e: KeyboardEvent) => {
    const to: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last };
    if (!(e.key in to)) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(last, to[e.key]!));
    setFocusIdx(next);
    refs.current[next]?.focus();
  };

  const hiPoint = data[hi]!;
  const edge = hi === 0 ? s.tipStart : hi === last ? s.tipEnd : '';

  return (
    <figure className={s.figure}>
      <figcaption className={hideCaption ? 'sr-only' : s.caption}>Meals per day</figcaption>
      <p className="sr-only">
        {`${num(total)} meals over the last ${n} days. Busiest day was ${longDay(parseDay(peak.date))} with ${num(peak.meals)} meals.`}
      </p>

      <div className={s.plot} onPointerLeave={() => setActive(null)}>
        <div className={s.bars} role="group" aria-label="Meals per day. Use the arrow keys to move between days." onKeyDown={onKeyDown}>
          {data.map((p, i) => (
            <button
              key={p.date}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              className={s.col}
              tabIndex={i === current ? 0 : -1}
              aria-label={`${longDay(parseDay(p.date))}, ${num(p.meals)} meals`}
              data-hi={hi === i || undefined}
              onPointerEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              onFocus={() => {
                setFocusIdx(i);
                setActive(i);
              }}
              onBlur={() => setActive(null)}
            >
              <span className={s.bar} style={{ height: `${Math.max(2, (p.meals / max) * 100)}%`, '--i': i } as CSSProperties} />
            </button>
          ))}
        </div>

        <div
          className={`${s.tip} ${edge}`}
          data-open={active !== null || undefined}
          style={{ left: `${((hi + 0.5) / n) * 100}%`, bottom: `calc(${(hiPoint.meals / max) * 100}% + 8px)` }}
          aria-hidden
        >
          <strong>{num(hiPoint.meals)}</strong>
          {active !== null && <span>{isToday(parseDay(hiPoint.date)) ? 'Today' : longDay(parseDay(hiPoint.date))}</span>}
        </div>
      </div>

      <div className={s.labels} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
        {data.map((p, i) => {
          const d = parseDay(p.date);
          return (
            <span key={p.date} data-hi={hi === i || undefined}>
              {isToday(d) ? 'Today' : weekday(d)}
            </span>
          );
        })}
      </div>

      <table className="sr-only">
        <caption>Meals rescued per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Meals</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.date}>
              <td>{longDay(parseDay(p.date))}</td>
              <td>{num(p.meals)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
