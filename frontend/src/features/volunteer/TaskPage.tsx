import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Moon, Radar } from 'lucide-react';
import { Avatar, Button, ButtonLink, cx, DietMark, Skeleton } from '../../components/ui';
import { FoodThumb } from '../../components/dash';
import { LiveMap, type Pin } from '../../components/map/LiveMap';
import { haversineKm, km, num, qty } from '../../lib/format';
import { useNow } from '../../lib/time';
import type { Donation, NgoRef } from '../../lib/types';
import { etaMin, type LatLng } from '../tracking/geo';
import { useVolunteer } from './context';
import { RADIUS_KM, reachable, useClaim, useDevicePosition, useFeed, useMyStats } from './hooks';
import { PickupSheet } from './PickupSheet';
import t from './task.module.css';

// Opens 7:30 pm, Opens tomorrow 7:30 pm, Opens Mon 7:30 pm
function opensLabel(iso: string, now: number) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return `Opens ${time}`;
  if (days === 1) return `Opens tomorrow ${time}`;
  return `Opens ${d.toLocaleDateString('en-IN', { weekday: 'short' })} ${time}`;
}

// One job at a time: go online, take the next pickup, deliver it
export default function TaskPage() {
  const { user, active, activeLoaded, skipped, setSkipped, setOnDuty } = useVolunteer();
  const home = useMemo(() => ({ lat: user.lat, lng: user.lng }), [user.lat, user.lng]);
  const online = user.onDuty;
  const watching = online && !active;
  const { origin, far } = useDevicePosition(watching, home);
  const me = active ? home : origin;
  const { items, error, loading, remove, retry } = useFeed(me, watching);
  const { pending, claim } = useClaim(remove);
  const [details, setDetails] = useState<Donation | null>(null);

  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  const open = (items ?? []).filter((d) => reachable(d, me, tick));
  const queue = open.filter((d) => !skipped.includes(d.id));
  const skippedOpen = open.length - queue.length;
  const offer = online && !active ? (queue[0] ?? null) : null;
  const drop = offer?.ngo;

  const pins: Pin[] = [{ id: 'me', lat: me.lat, lng: me.lng, kind: 'me' }];
  let route: [number, number][] | undefined;
  if (active) {
    const from = active.lastLocation ?? me;
    if (active.status === 'CLAIMED') pins.push({ id: 'donor', lat: active.lat, lng: active.lng, kind: 'donor' });
    if (active.ngo) pins.push({ id: 'ngo', lat: active.ngo.lat, lng: active.ngo.lng, kind: 'ngo' });
    route = [[from.lat, from.lng], ...pins.slice(1).map((p) => [p.lat, p.lng] as [number, number])];
  } else if (offer) {
    pins.push({ id: 'donor', lat: offer.lat, lng: offer.lng, kind: 'donor' });
    if (drop) pins.push({ id: 'ngo', lat: drop.lat, lng: drop.lng, kind: 'ngo' });
    route = pins.map((p) => [p.lat, p.lng]);
  }

  return (
    <div className={t.page}>
      <div className={cx(t.map, !online && !active && t.mapOff)}>
        <LiveMap pins={pins} remaining={route} radius={online && !active && !offer ? { ...me, km: RADIUS_KM } : undefined} padding={72} />
      </div>

      <header className={t.top}>
        <Link to="/volunteer/profile" aria-label="Profile">
          <Avatar initials={user.initials} size={40} tone="basil" className={t.raised} />
        </Link>
        <button type="button" className={t.status} data-on={online || undefined} aria-pressed={online} onClick={() => setOnDuty(!online)}>
          <span className={t.statusDot} aria-hidden />
          {online ? 'Online' : 'Offline'}
        </button>
        <MonthChip />
      </header>

      <section className={t.card} aria-live="polite">
        {far && watching && <p className={t.note}>Using your home address</p>}
        {!activeLoaded ? (
          <Loading />
        ) : active ? (
          <ActiveTask d={active} me={me} />
        ) : !online ? (
          <Offline onGo={() => setOnDuty(true)} />
        ) : loading ? (
          <Searching />
        ) : error && !items ? (
          <Message icon={<Radar size={22} strokeWidth={1.75} aria-hidden />} title="Couldn’t load pickups" text={error}>
            <Button variant="secondary" size="lg" block onClick={retry}>
              Try again
            </Button>
          </Message>
        ) : offer ? (
          <Offer
            d={offer}
            drop={drop}
            me={me}
            left={queue.length}
            busy={pending === offer.id}
            onAccept={() => claim(offer)}
            onSkip={() => setSkipped((s) => [...s, offer.id])}
            onDetails={() => setDetails(offer)}
          />
        ) : (
          <Message icon={<Radar size={22} strokeWidth={1.75} aria-hidden />} title="No pickups right now" text="Stay online. The next pickup near you shows up here the moment a donor posts it.">
            {skippedOpen > 0 && (
              <Button variant="secondary" size="lg" block onClick={() => setSkipped([])}>
                Show skipped ({skippedOpen})
              </Button>
            )}
          </Message>
        )}
      </section>

      <PickupSheet d={details} onClose={() => setDetails(null)} busy={pending === details?.id} blocked={!!active} onClaim={(d) => claim(d)} />
    </div>
  );
}

function pickupLeft(ms: number) {
  const m = Math.max(1, Math.ceil(ms / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function MonthChip() {
  const { stats } = useMyStats();
  return (
    <Link to="/volunteer/impact" className={t.chip}>
      <strong>{stats ? num(stats.meals) : '–'}</strong> meals
    </Link>
  );
}

function Offer({ d, drop, me, left, busy, onAccept, onSkip, onDetails }: {
  d: Donation;
  drop?: NgoRef;
  me: LatLng;
  left: number;
  busy: boolean;
  onAccept: () => void;
  onSkip: () => void;
  onDetails: () => void;
}) {
  const toPickup = haversineKm(me, d);
  const toDrop = drop ? haversineKm(d, drop) : 0;
  const now = useNow();
  const closes = new Date(d.pickupUntil).getTime() - now;
  const opensAt = new Date(d.pickupFrom).getTime() > now ? d.pickupFrom : null;
  const critical = !opensAt && closes < 30 * 60_000;
  return (
    <div className={t.offer} key={d.id}>
      <div className={t.offerHead}>
        <span className={t.tag}>New pickup{left > 1 ? `, ${left - 1} more nearby` : ''}</span>
        <span className={cx(t.timer, critical && t.timerCritical)}>
          {opensAt ? opensLabel(opensAt, now) : `Pick up within ${pickupLeft(closes)}`}
        </span>
      </div>

      {drop && <p className={t.askedBy}>{drop.name} asked for this</p>}

      <button type="button" className={t.food} onClick={onDetails}>
        <FoodThumb d={d} size={56} />
        <span className={t.foodText}>
          <strong>{d.title}</strong>
          <span>
            <DietMark diet={d.diet} /> {d.meals} meals, {qty(d)}
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={2} className={t.chev} aria-hidden />
      </button>

      <ol className={t.route}>
        <li>
          <span className={t.stopDot} aria-hidden />
          <span className={t.stopText}>
            <em>Pick up</em>
            <strong>{d.donor.name}</strong>
            <span>{d.address}</span>
          </span>
          <span className={t.stopKm}>{km(toPickup)}</span>
        </li>
        {drop && (
          <li>
            <span className={t.stopSquare} aria-hidden />
            <span className={t.stopText}>
              <em>Drop</em>
              <strong>{drop.name}</strong>
              <span>{drop.address}</span>
            </span>
            <span className={t.stopKm}>{km(toDrop)}</span>
          </li>
        )}
      </ol>

      <div className={t.actions}>
        <Button variant="secondary" size="lg" onClick={onSkip}>
          Skip
        </Button>
        <Button size="lg" className={t.accept} loading={busy} onClick={onAccept}>
          Accept, about {etaMin(toPickup + toDrop)} min
        </Button>
      </div>
    </div>
  );
}

function ActiveTask({ d, me }: { d: Donation; me: LatLng }) {
  const toDonor = d.status === 'CLAIMED';
  const stop = toDonor ? { name: d.donor.name, address: d.address, lat: d.lat, lng: d.lng } : d.ngo;
  const from = d.lastLocation ?? me;
  const dist = stop ? haversineKm(from, stop) : 0;
  return (
    <div className={t.offer}>
      <div className={t.offerHead}>
        <span className={cx(t.tag, t.tagLive)}>
          <span className={t.pulse} aria-hidden /> {toDonor ? 'Step 1 of 2, pick up' : 'Step 2 of 2, drop'}
        </span>
        <span className={t.timer}>{etaMin(dist)} min</span>
      </div>
      <div className={t.stopBig}>
        <h1>{stop?.name ?? 'The kitchen'}</h1>
        <p>
          {stop?.address}, {km(dist)}
        </p>
      </div>
      <div className={t.food}>
        <FoodThumb d={d} size={48} />
        <span className={t.foodText}>
          <strong>{d.title}</strong>
          <span>
            {d.meals} meals, {qty(d)}
          </span>
        </span>
      </div>
      <ButtonLink to={`/volunteer/pickup/${d.id}`} size="lg" block>
        {toDonor ? 'Go to pickup' : 'Go to drop'}
      </ButtonLink>
    </div>
  );
}

function Offline({ onGo }: { onGo: () => void }) {
  return (
    <Message icon={<Moon size={22} strokeWidth={1.75} aria-hidden />} title="You’re offline" text="Go online and we’ll send you the pickup nearest to you, one at a time.">
      <Button size="lg" block onClick={onGo}>
        Go online
      </Button>
    </Message>
  );
}

function Searching() {
  return (
    <div className={t.message}>
      <span className={cx(t.messageIcon, t.searching)}>
        <Radar size={22} strokeWidth={1.75} aria-hidden />
      </span>
      <h2>Finding pickups near you</h2>
      <Skeleton h={52} r={26} />
    </div>
  );
}

function Loading() {
  return (
    <div className={t.message} aria-busy="true">
      <Skeleton w="60%" h={22} />
      <Skeleton w="85%" h={14} />
      <Skeleton h={52} r={26} />
    </div>
  );
}

function Message({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children?: ReactNode }) {
  return (
    <div className={t.message}>
      <span className={t.messageIcon}>{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
