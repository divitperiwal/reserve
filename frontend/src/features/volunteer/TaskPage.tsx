import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Moon, Radar } from 'lucide-react';
import { Avatar, Button, ButtonLink, cx, DietMark, RiskBadge, Skeleton } from '../../components/ui';
import { FoodThumb } from '../../components/dash';
import { LiveMap, type Pin } from '../../components/map/LiveMap';
import { shownError } from '../../lib/api';
import { haversineKm, km, num, qty } from '../../lib/format';
import { dateLocale, useT, type T } from '../../lib/i18n';
import { useNow } from '../../lib/time';
import type { Donation, NgoRef } from '../../lib/types';
import { etaMin, type LatLng } from '../tracking/geo';
import { useVolunteer } from './context';
import { RADIUS_KM, reachable, useClaim, useDevicePosition, useFeed, useMyStats } from './hooks';
import { PickupSheet } from './PickupSheet';
import c from './task.module.css';

// Opens 7:30 pm, Opens tomorrow 7:30 pm, Opens Mon 7:30 pm
function opensLabel(iso: string, now: number, t: T) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(dateLocale(), { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return t('Opens {time}', { time });
  if (days === 1) return t('Opens tomorrow {time}', { time });
  return t('Opens {day} {time}', { day: d.toLocaleDateString(dateLocale(), { weekday: 'short' }), time });
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
  const t = useT();

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
    <div className={c.page}>
      <div className={cx(c.map, !online && !active && c.mapOff)}>
        <LiveMap pins={pins} remaining={route} radius={online && !active && !offer ? { ...me, km: RADIUS_KM } : undefined} padding={72} />
      </div>

      <header className={c.top}>
        <Link to="/volunteer/profile" aria-label={t('Profile')}>
          <Avatar initials={user.initials} size={40} tone="basil" className={c.raised} />
        </Link>
        <button type="button" className={c.status} data-on={online || undefined} aria-pressed={online} onClick={() => setOnDuty(!online)}>
          <span className={c.statusDot} aria-hidden />
          {online ? t('Online') : t('Offline')}
        </button>
        <MonthChip />
      </header>

      <section className={c.card} aria-live="polite">
        {far && watching && <p className={c.note}>{t('Using your home address')}</p>}
        {!activeLoaded ? (
          <Loading />
        ) : active ? (
          <ActiveTask d={active} me={me} />
        ) : !online ? (
          <Offline onGo={() => setOnDuty(true)} />
        ) : loading ? (
          <Searching />
        ) : error && !items ? (
          <Message icon={<Radar size={22} strokeWidth={1.75} aria-hidden />} title={t('Couldn’t load pickups')} text={shownError(error, t)}>
            <Button variant="secondary" size="lg" block onClick={retry}>
              {t('Try again')}
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
          <Message icon={<Radar size={22} strokeWidth={1.75} aria-hidden />} title={t('No pickups right now')} text={t('Stay online. The next pickup near you shows up here the moment a donor posts it.')}>
            {skippedOpen > 0 && (
              <Button variant="secondary" size="lg" block onClick={() => setSkipped([])}>
                {t('Show skipped ({n})', { n: skippedOpen })}
              </Button>
            )}
          </Message>
        )}
      </section>

      <PickupSheet d={details} onClose={() => setDetails(null)} busy={pending === details?.id} blocked={!!active} onClaim={(d) => claim(d)} />
    </div>
  );
}

function pickupLeft(ms: number, t: T) {
  const m = Math.max(1, Math.ceil(ms / 60_000));
  return m >= 60 ? t('{h}h {m}m', { h: Math.floor(m / 60), m: m % 60 }) : t('{m}m', { m });
}

function MonthChip() {
  const { stats } = useMyStats();
  const t = useT();
  return (
    <Link to="/volunteer/impact" className={c.chip}>
      <strong>{stats ? num(stats.meals) : '–'}</strong> {t('meals')}
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
  const t = useT();
  const closes = new Date(d.pickupUntil).getTime() - now;
  const opensAt = new Date(d.pickupFrom).getTime() > now ? d.pickupFrom : null;
  const critical = !opensAt && closes < 30 * 60_000;
  return (
    <div className={c.offer} key={d.id}>
      <div className={c.offerHead}>
        <span className={c.tag}>{left > 1 ? t('New pickup, {n} more nearby', { n: left - 1 }) : t('New pickup')}</span>
        <span className={cx(c.timer, critical && c.timerCritical)}>
          {opensAt ? opensLabel(opensAt, now, t) : t('Pick up within {time}', { time: pickupLeft(closes, t) })}
        </span>
      </div>

      {drop && <p className={c.askedBy}>{t('{ngo} asked for this', { ngo: drop.name })}</p>}

      <RiskBadge d={d} from={me} kitchen={drop} />

      <button type="button" className={c.food} onClick={onDetails}>
        <FoodThumb d={d} size={56} />
        <span className={c.foodText}>
          <strong>{d.title}</strong>
          <span>
            <DietMark diet={d.diet} /> {t('{meals} meals, {qty}', { meals: d.meals, qty: qty(d, t) })}
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={2} className={c.chev} aria-hidden />
      </button>

      <ol className={c.route}>
        <li>
          <span className={c.stopDot} aria-hidden />
          <span className={c.stopText}>
            <em>{t('Pick up')}</em>
            <strong>{d.donor.name}</strong>
            <span>{d.address}</span>
          </span>
          <span className={c.stopKm}>{km(toPickup)}</span>
        </li>
        {drop && (
          <li>
            <span className={c.stopSquare} aria-hidden />
            <span className={c.stopText}>
              <em>{t('Drop')}</em>
              <strong>{drop.name}</strong>
              <span>{drop.address}</span>
            </span>
            <span className={c.stopKm}>{km(toDrop)}</span>
          </li>
        )}
      </ol>

      <div className={c.actions}>
        <Button variant="secondary" size="lg" onClick={onSkip}>
          {t('Skip')}
        </Button>
        <Button size="lg" className={c.accept} loading={busy} onClick={onAccept}>
          {t('Accept, about {m} min', { m: etaMin(toPickup + toDrop) })}
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
  const t = useT();
  return (
    <div className={c.offer}>
      <div className={c.offerHead}>
        <span className={cx(c.tag, c.tagLive)}>
          <span className={c.pulse} aria-hidden /> {toDonor ? t('Step 1 of 2, pick up') : t('Step 2 of 2, drop')}
        </span>
        <span className={c.timer}>{t('{m} min', { m: etaMin(dist) })}</span>
      </div>
      <div className={c.stopBig}>
        <h1>{stop?.name ?? t('The kitchen')}</h1>
        <p>
          {stop?.address}, {km(dist)}
        </p>
      </div>
      <RiskBadge d={d} from={from} />

      <div className={c.food}>
        <FoodThumb d={d} size={48} />
        <span className={c.foodText}>
          <strong>{d.title}</strong>
          <span>
            {t('{meals} meals, {qty}', { meals: d.meals, qty: qty(d, t) })}
          </span>
        </span>
      </div>
      <ButtonLink to={`/volunteer/pickup/${d.id}`} size="lg" block>
        {toDonor ? t('Go to pickup') : t('Go to drop')}
      </ButtonLink>
    </div>
  );
}

function Offline({ onGo }: { onGo: () => void }) {
  const t = useT();
  return (
    <Message icon={<Moon size={22} strokeWidth={1.75} aria-hidden />} title={t('You’re offline')} text={t('Go online and we’ll send you the pickup nearest to you, one at a time.')}>
      <Button size="lg" block onClick={onGo}>
        {t('Go online')}
      </Button>
    </Message>
  );
}

function Searching() {
  const t = useT();
  return (
    <div className={c.message}>
      <span className={cx(c.messageIcon, c.searching)}>
        <Radar size={22} strokeWidth={1.75} aria-hidden />
      </span>
      <h2>{t('Finding pickups near you')}</h2>
      <Skeleton h={52} r={26} />
    </div>
  );
}

function Loading() {
  return (
    <div className={c.message} aria-busy="true">
      <Skeleton w="60%" h={22} />
      <Skeleton w="85%" h={14} />
      <Skeleton h={52} r={26} />
    </div>
  );
}

function Message({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children?: ReactNode }) {
  return (
    <div className={c.message}>
      <span className={c.messageIcon}>{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
