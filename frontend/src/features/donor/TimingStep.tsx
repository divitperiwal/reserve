import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, Chip, cx, errorClass, inputClass } from '../../components/ui';
import { useT } from '../../lib/i18n';
import { clockTime, dateKey, dayChips, dayTime, roundQuarter, shelfLife, timeKey, whenPhrase } from './donorKit';
import type { PostForm, TimeKey } from './usePostForm';
import s from './timing.module.css';

const HOUR = 3_600_000;
const MIN = 60_000;

export default function TimingStep({ form }: { form: PostForm }) {
  const { values, issue, setWhen, setWindow, autofilled, now } = form;
  const t = useT();
  const at = (hour: number, days = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.setHours(hour, 0, 0, 0);
  };
  const iso = (t: number) => new Date(t).toISOString();
  const best = values.bestBefore ? new Date(values.bestBefore).getTime() : null;
  const from = values.pickupFrom ? new Date(values.pickupFrom).getTime() : null;
  const until = values.pickupUntil ? new Date(values.pickupUntil).getTime() : null;

  const bestPresets = [
    { label: 'In 2 hours', at: roundQuarter(now + 2 * HOUR, true), fixed: false },
    { label: 'In 4 hours', at: roundQuarter(now + 4 * HOUR, true), fixed: false },
    { label: 'Tonight 11 pm', at: at(23), fixed: true },
    { label: 'Tomorrow 9 am', at: at(9, 1), fixed: true },
  ].filter((p) => p.at > now);

  const start = roundQuarter(now, true);
  const windowPresets = [
    { label: 'Next hour', from: start, until: start + HOUR },
    { label: 'Next 2 hours', from: start, until: start + 2 * HOUR },
    { label: 'Until best before minus 30 min', from: start, until: best === null ? 0 : best - 30 * MIN },
  ].filter((p) => (best === null ? p.until > p.from && !p.label.startsWith('Until') : p.until > p.from && p.until <= best));

  const summary = from !== null && until !== null && best !== null && from < until && !issue;
  const sameDay = summary && dateKey(from) === dateKey(until);

  return (
    <>
      {autofilled && <p className={s.note}>{t('We filled these in for {food}. Change anything.', { food: t(shelfLife[autofilled].noun) })}</p>}

      <section className={s.block}>
        <Presets label={t('Best before presets')}>
          {bestPresets.map((p) => (
            <Chip key={p.label} active={p.fixed && best === p.at} onClick={() => setWhen('bestBefore', iso(p.at))}>
              {t(p.label)}
            </Chip>
          ))}
        </Presets>
        <WhenRow label={t('Best before')} value={values.bestBefore} field="bestBefore" form={form} />
      </section>

      <section className={s.block}>
        <h3 className={s.heading}>{t('Pickup window')}</h3>
        <Presets label={t('Pickup window presets')}>
          {windowPresets.map((p) => (
            <Chip key={p.label} onClick={() => setWindow(iso(p.from), iso(p.until))}>
              {t(p.label)}
            </Chip>
          ))}
        </Presets>
        <WhenRow label={t('Pickup from')} value={values.pickupFrom} field="pickupFrom" form={form} />
        <WhenRow label={t('Pickup until')} value={values.pickupUntil} field="pickupUntil" form={form} hideError={!!issue} />
        {issue && (
          <div className={s.issue} role="alert">
            <p>{t('Pickup ends {until}, after the food’s best before of {best}.', { until: issue.until, best: issue.best })}</p>
            <Button variant="tinted" size="sm" onClick={() => setWhen('pickupUntil', issue.fix)}>
              {t('End pickup at {time}', { time: dayTime(issue.fix, t) })}
            </Button>
          </div>
        )}
      </section>

      {summary && (
        <p className={s.summary}>
          {t('Volunteers can pick up {from} to {until}. Food is good until {best}.', {
            from: whenPhrase(from, t),
            until: sameDay ? clockTime(until) : whenPhrase(until, t),
            best: whenPhrase(best, t),
          })}
        </p>
      )}
    </>
  );
}

function Presets({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.presets} role="group" aria-label={label}>
      {children}
    </div>
  );
}

// Native input that keeps what is typed until it is a complete, acceptable value
function LiveInput({ value, accept, onCommit, ...rest }: { value: string; accept: (v: string) => boolean; onCommit: (v: string) => void; type: string; min?: string; step?: number; autoFocus?: boolean; 'aria-label': string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      {...rest}
      className={cx(inputClass, s.input)}
      value={text}
      onBlur={() => setText(value)}
      onChange={(e) => {
        setText(e.target.value);
        if (accept(e.target.value)) onCommit(e.target.value);
      }}
    />
  );
}

// One value on one line: label, Today, Tomorrow, Pick date, time
function WhenRow({ label, value, field, form, hideError }: { label: string; value: string; field: TimeKey; form: PostForm; hideError?: boolean }) {
  const { now, setDate, setTime, error } = form;
  const t = useT();
  const [picking, setPicking] = useState(false);
  const [today, tomorrow] = dayChips(now, t);
  const day = value ? dateKey(value) : '';
  const custom = !!day && day !== today!.key && day !== tomorrow!.key;
  const err = hideError ? undefined : error(field);
  const choose = (key: string) => {
    setPicking(false);
    setDate(field, key);
  };
  return (
    <div className={s.row} role="group" aria-label={label}>
      <span className={s.label}>{label}</span>
      <div className={s.controls}>
        <Chip active={day === today!.key} onClick={() => choose(today!.key)}>
          {today!.label}
        </Chip>
        <Chip active={day === tomorrow!.key} onClick={() => choose(tomorrow!.key)}>
          {tomorrow!.label}
        </Chip>
        {picking || custom ? (
          <LiveInput
            type="date"
            autoFocus={picking}
            aria-label={t('{label} date', { label })}
            min={dateKey(now)}
            value={day}
            accept={(v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= dateKey(now)}
            onCommit={(v) => setDate(field, v)}
          />
        ) : (
          <Chip onClick={() => setPicking(true)}>{t('Pick date')}</Chip>
        )}
        <LiveInput type="time" step={900} aria-label={t('{label} time', { label })} value={timeKey(value)} accept={(v) => !!v} onCommit={(v) => setTime(field, v)} />
      </div>
      {err && (
        <span className={cx(errorClass, s.err)}>
          <AlertCircle size={14} aria-hidden /> {err}
        </span>
      )}
    </div>
  );
}
