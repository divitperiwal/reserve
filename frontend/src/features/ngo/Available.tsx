import { useCallback, useEffect, useMemo, useState } from 'react';
import { Hourglass, Minus, Plus, Utensils } from 'lucide-react';
import { Button, DietMark, EmptyState, Sheet, Skeleton, useToast } from '../../components/ui';
import { FoodThumb, SectionHead } from '../../components/dash';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { haversineKm, km, unitLabel } from '../../lib/format';
import { useStream } from '../../lib/stream';
import { shortLeft, timeOfDay, useNow } from '../../lib/time';
import type { Donation } from '../../lib/types';
import { useDeliveries, useWaiting } from './useDeliveries';
import s from './available.module.css';

const RADIUS_KM = 15;

// Open food near this kitchen, kept live from the stream
function useAvailable() {
  const { user } = useAuth();
  const [items, setItems] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const kitchen = useMemo(() => (user?.lat && user?.lng ? { lat: user.lat, lng: user.lng } : null), [user?.lat, user?.lng]);

  const reload = useCallback(() => {
    api
      .feed({ radiusKm: RADIUS_KM })
      .then((xs) => {
        setItems(xs);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  useStream({
    donation: (d) => {
      const open = d.status === 'AVAILABLE' && +new Date(d.pickupUntil) > Date.now();
      setItems((xs) => {
        const i = xs.findIndex((x) => x.id === d.id);
        if (!open) return i === -1 ? xs : xs.filter((x) => x.id !== d.id);
        const distanceKm = d.distanceKm ?? xs[i]?.distanceKm ?? (kitchen ? haversineKm(kitchen, d) : undefined);
        if (i === -1) return kitchen && distanceKm !== undefined && distanceKm > RADIUS_KM ? xs : [{ ...d, distanceKm }, ...xs];
        const next = xs.slice();
        next[i] = { ...xs[i]!, ...d, distanceKm };
        return next;
      });
    },
  });

  return { items, loading, error, reload };
}

const closesIn = (iso: string, now: number) =>
  +new Date(iso) <= now ? 'Pickup window closed' : `Pickup closes in ${shortLeft(+new Date(iso) - now).replace(' left', '')}`;

const unitText = (n: number, u: Donation['unit']) => (n === 1 && u !== 'KG' ? unitLabel[u].replace(/s$/, '') : unitLabel[u]);
const qty = (d: Pick<Donation, 'quantity' | 'unit'>) => `${d.quantity} ${unitText(d.quantity, d.unit)}`;

export function AvailablePanel() {
  const { user } = useAuth();
  const { items, loading, error, reload } = useAvailable();
  const now = useNow();
  const [pickedId, setPickedId] = useState<number | null>(null);
  const accepting = user?.acceptingFood ?? true;
  const list = items
    .filter((d) => +new Date(d.pickupUntil) > now)
    .sort((a, b) => +new Date(a.pickupUntil) - +new Date(b.pickupUntil));

  return (
    <section className={s.block}>
      <SectionHead title="Available food" count={list.length} />
      {loading && !items.length ? (
        <Skeleton h={120} r={18} />
      ) : error && !items.length ? (
        <EmptyState icon={Utensils} title="Couldn’t load available food" action={<Button variant="secondary" onClick={reload}>Try again</Button>}>
          {error}
        </EmptyState>
      ) : list.length === 0 ? (
        <div className={s.empty}>
          <Utensils size={22} strokeWidth={1.75} aria-hidden />
          <span>No food is waiting right now. New posts show up here.</span>
        </div>
      ) : (
        <ul className={s.list}>
          {list.map((d) => (
            <li key={d.id} className={s.row}>
              <FoodThumb d={d} size={72} />
              <span className={s.text}>
                <strong>{d.title}</strong>
                <span>
                  {d.donor.name}
                  {d.distanceKm !== undefined && `, ${km(d.distanceKm)} away`}
                </span>
                <span>
                  {qty(d)}, {d.meals} meals
                  <span className={s.diet}>
                    <DietMark diet={d.diet} />
                    {d.diet === 'VEG' ? 'Veg' : 'Non-veg'}
                  </span>
                </span>
                <span className={s.meta}>
                  {closesIn(d.pickupUntil, now)}, best before {timeOfDay(d.bestBefore, now)}
                </span>
              </span>
              {accepting && (
                <Button size="sm" onClick={() => setPickedId(d.id)}>
                  Accept
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <AcceptSheet id={pickedId} food={list.find((d) => d.id === pickedId)} onClose={() => setPickedId(null)} onDone={reload} />
    </section>
  );
}

function AcceptSheet({ id, food, onClose, onDone }: { id: number | null; food: Donation | undefined; onClose: () => void; onDone: () => void }) {
  const { upsert } = useDeliveries();
  const toast = useToast();
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const max = food?.quantity ?? 1;

  useEffect(() => {
    setRaw(String(food?.quantity ?? ''));
    setError(null);
    setBusy(false);
  }, [id]);

  // The available quantity can drop while the sheet is open
  useEffect(() => {
    setRaw((r) => (Number(r) > max ? String(max) : r));
  }, [max]);

  const n = Number(raw);
  const valid = raw !== '' && Number.isInteger(n) && n >= 1 && n <= max;
  const meals = food && valid ? Math.max(1, Math.round((food.meals * n) / food.quantity)) : 0;
  const step = (by: number) => setRaw(String(Math.min(max, Math.max(1, (valid ? n : max) + by))));
  const unit = food ? unitText(valid ? n : max, food.unit) : '';
  const fixRaw = () => {
    const v = Math.round(Number(raw));
    setRaw(String(raw === '' || Number.isNaN(v) ? max : Math.min(max, Math.max(1, v))));
  };

  const confirm = async () => {
    if (!food || !valid) return;
    setBusy(true);
    setError(null);
    try {
      const got = await api.accept(food.id, n);
      upsert(got);
      toast(`Accepted ${n} ${unit} of ${food.title}`);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? (e.fields?.quantity ?? e.message) : (e as Error).message);
      setBusy(false);
      onDone();
    }
  };

  return (
    <Sheet
      open={id !== null}
      onClose={onClose}
      title="Accept food"
      footer={
        food ? (
          <Button block loading={busy} disabled={!valid} onClick={confirm}>
            {valid ? `Accept ${n} ${unit}` : 'Accept'}
          </Button>
        ) : (
          <Button block variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      {!food && <p className={s.sheetText}>This food is no longer available.</p>}
      {food && (
        <div className={s.sheet}>
          <div className={s.summary}>
            <FoodThumb d={food} size={64} />
            <span className={s.text}>
              <strong>{food.title}</strong>
              <span>
                {food.donor.name}
                {food.distanceKm !== undefined && `, ${km(food.distanceKm)} away`}
              </span>
              <span>
                {qty(food)} available, {food.meals} meals
              </span>
            </span>
          </div>
          <div className={s.amount}>
            <label htmlFor="accept-qty">How much do you need?</label>
            <div className={s.stepper}>
              <button type="button" aria-label="Less" onClick={() => step(-1)} disabled={valid && n <= 1}>
                <Minus size={16} strokeWidth={2.25} aria-hidden />
              </button>
              <input id="accept-qty" type="number" inputMode="numeric" min={1} max={max} value={raw} onChange={(e) => setRaw(e.target.value)} onBlur={fixRaw} />
              <button type="button" aria-label="More" onClick={() => step(1)} disabled={valid && n >= max}>
                <Plus size={16} strokeWidth={2.25} aria-hidden />
              </button>
              <span className={s.unit}>{unit}</span>
              <button type="button" className={s.all} onClick={() => setRaw(String(max))}>
                Take all
              </button>
            </div>
            <p className={s.gives}>{valid ? `That gives ${meals} meals.` : `Enter a number from 1 to ${max}.`}</p>
          </div>
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}

// Food this kitchen accepted that no volunteer has taken yet
export function WaitingPanel() {
  const { list } = useWaiting();
  const { remove } = useDeliveries();
  const toast = useToast();
  const now = useNow();
  const [givingId, setGivingId] = useState<number | null>(null);
  const giving = list.find((d) => d.id === givingId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (d: Donation) => {
    setError(null);
    setGivingId(d.id);
  };

  const giveBack = async () => {
    if (!giving) return;
    setBusy(true);
    setError(null);
    try {
      await api.withdraw(giving.id);
      remove(giving.id);
      toast(`${giving.title} given back`);
      setGivingId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!list.length) return null;
  return (
    <section className={s.block}>
      <SectionHead title="Waiting for a volunteer" count={list.length} />
      <ul className={s.list}>
        {list.map((d) => (
          <li key={d.id} className={s.row}>
            <FoodThumb d={d} size={56} />
            <span className={s.text}>
              <strong>{d.title}</strong>
              <span>
                {qty(d)}, {d.meals} meals, from {d.donor.name}
              </span>
              <span className={s.meta}>
                <Hourglass size={13} strokeWidth={2} aria-hidden /> {closesIn(d.pickupUntil, now)}
              </span>
            </span>
            <Button size="sm" variant="secondary" onClick={() => open(d)}>
              Give back
            </Button>
          </li>
        ))}
      </ul>
      <Sheet
        open={!!giving}
        onClose={() => setGivingId(null)}
        title="Give this food back?"
        footer={
          <Button block variant="secondary" loading={busy} onClick={giveBack}>
            Give back
          </Button>
        }
      >
        <p className={s.sheetText}>
          {giving?.title} goes back to Available food so another kitchen can take it.
        </p>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
      </Sheet>
    </section>
  );
}
