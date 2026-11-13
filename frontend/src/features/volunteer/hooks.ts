import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { haversineKm } from '../../lib/format';
import { useStream } from '../../lib/stream';
import type { Donation, GeoPoint, MyStats } from '../../lib/types';
import { etaMin, isActive, stepToward, type LatLng } from '../tracking/geo';
import { mergeDonation } from '../tracking/useTracking';
import { useVolunteer } from './context';

export const RADIUS_KM = 7;

// Reachable means we can arrive before the pickup window closes
export function reachable(d: Donation, origin: LatLng, now = Date.now()) {
  return now + etaMin(haversineKm(origin, d)) * 60_000 <= new Date(d.pickupUntil).getTime();
}

function matches(d: Donation, origin: LatLng) {
  return d.status === 'ACCEPTED' && reachable(d, origin) && haversineKm(origin, d) <= RADIUS_KM;
}

const byExpiry = (list: Donation[]) => [...list].sort((a, b) => new Date(a.pickupUntil).getTime() - new Date(b.pickupUntil).getTime());

// Open pickups nearby, soonest to close first, kept live by the donation stream
export function useFeed(origin: LatLng, enabled: boolean) {
  const [items, setItems] = useState<Donation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setError(null);
    api
      .feed({ lat: origin.lat, lng: origin.lng, radiusKm: RADIUS_KM, sort: 'expiry' })
      .then((list) => live && setItems(byExpiry(list)))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [enabled, origin.lat, origin.lng, attempt]);

  useStream({
    donation: (d) =>
      setItems((list) => {
        if (!list) return list;
        const rest = list.filter((x) => x.id !== d.id);
        if (!matches(d, origin)) return rest.length === list.length ? list : rest;
        const prev = list.find((x) => x.id === d.id) ?? null;
        return byExpiry([...rest, { ...mergeDonation(prev, d), distanceKm: haversineKm(origin, d) }]);
      }),
  });

  const remove = useCallback((id: number) => setItems((l) => l && l.filter((x) => x.id !== id)), []);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { items, error, loading: items === null && !error, remove, retry };
}

// Current claimed or picked-up donation for this volunteer, kept in sync with the stream
export function useActivePickupState(userId: number) {
  const [active, setActive] = useState<Donation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .mine()
      .then((list) => setActive(list.find((d) => isActive(d.status)) ?? null))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [userId]);

  useStream({
    donation: (d) =>
      setActive((cur) => {
        if (cur && cur.id === d.id) return isActive(d.status) ? mergeDonation(cur, d) : null;
        if (!cur && d.volunteer?.id === userId && isActive(d.status)) return d;
        return cur;
      }),
    location: (l) => setActive((cur) => (cur && cur.id === l.donationId ? { ...cur, lastLocation: l } : cur)),
  });

  return { active, setActive, loaded };
}

export function useClaim(onGone: (id: number) => void) {
  const { setActive } = useVolunteer();
  const toast = useToast();
  const navigate = useNavigate();
  const [pending, setPending] = useState<number | null>(null);

  const claim = useCallback(
    async (d: Donation) => {
      setPending(d.id);
      try {
        const res = await api.claim(d.id);
        setActive(res);
        toast(`Claimed. Head to ${d.donor.name}.`);
        navigate(`/volunteer/pickup/${d.id}`);
      } catch (e) {
        toast((e as Error).message, { error: true });
        if (e instanceof ApiError && e.status === 409) onGone(d.id);
      } finally {
        setPending(null);
      }
    },
    [navigate, onGone, setActive, toast],
  );

  return { pending, claim };
}

type GpsState = 'pending' | 'ok' | 'far' | 'denied' | 'unavailable';

const FAR_KM = 30;
const MOVE_KM = 0.3;

// Share the rider's position while a pickup is active, with a simulated ride for demos
export function useLocationShare(d: Donation | null, onPoint: (p: GeoPoint) => void) {
  const active = !!d && isActive(d.status);
  const [gps, setGps] = useState<GpsState>('pending');
  const [simulating, setSimulating] = useState(false);
  const lastSent = useRef(0);
  const simPos = useRef<LatLng | null>(null);
  const dRef = useRef(d);
  dRef.current = d;
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;
  const id = d?.id;

  const send = useCallback(
    (p: LatLng) => {
      if (!id) return;
      api
        .sendLocation(id, p.lat, p.lng)
        .then(() => onPointRef.current({ lat: p.lat, lng: p.lng, at: new Date().toISOString() }))
        .catch(() => {});
    },
    [id],
  );

  useEffect(() => {
    if (!active || simulating) return;
    if (!('geolocation' in navigator)) {
      setGps('unavailable');
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const cur = dRef.current;
        if (cur && haversineKm(p, cur) > FAR_KM) {
          setGps('far');
          return;
        }
        setGps('ok');
        if (Date.now() - lastSent.current < 5000) return;
        lastSent.current = Date.now();
        send(p);
      },
      (err) => setGps(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [active, simulating, send]);

  const status = d?.status;
  useEffect(() => {
    if (!active || !simulating) return;
    const tick = () => {
      const cur = dRef.current;
      if (!cur) return;
      const target = cur.status === 'PICKED_UP' && cur.ngo ? cur.ngo : { lat: cur.lat, lng: cur.lng };
      const from = simPos.current ?? simStart(cur);
      const next = stepToward(from, target, 0.2);
      simPos.current = next;
      send(next);
    };
    tick();
    const t = window.setInterval(tick, 3000);
    return () => window.clearInterval(t);
  }, [active, simulating, status, send]);

  const canSimulate = simulating || gps === 'far' || gps === 'denied' || gps === 'unavailable';
  return { active, gps, sharing: active && (simulating || gps === 'ok'), canSimulate, simulating, setSimulating };
}

// Start from the last real fix near the pickup, otherwise a couple of km out from the donor
function simStart(d: Donation): LatLng {
  const last = d.lastLocation;
  if (last && haversineKm(last, d) < FAR_KM) return last;
  if (d.status === 'PICKED_UP') return { lat: d.lat, lng: d.lng };
  const away = d.ngo ? { lat: d.lat - (d.ngo.lat - d.lat), lng: d.lng - (d.ngo.lng - d.lng) } : { lat: d.lat - 0.02, lng: d.lng - 0.01 };
  const dist = haversineKm(d, away);
  return dist > 0.5 ? stepToward(d, away, Math.min(2.4, dist)) : { lat: d.lat - 0.018, lng: d.lng - 0.008 };
}

// Watch the device position while enabled; a fix far from home is reported as far
export function useDevicePosition(enabled: boolean, home: LatLng) {
  const [pos, setPos] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) {
      setPos(null);
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (g) => {
        const p = { lat: g.coords.latitude, lng: g.coords.longitude };
        setPos((cur) => (cur && haversineKm(cur, p) < MOVE_KM ? cur : p));
      },
      (err) => err.code === err.PERMISSION_DENIED && setPos(null),
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watch);
      setPos(null);
    };
  }, [enabled]);

  const near = !!pos && haversineKm(pos, home) <= FAR_KM;
  return { origin: near && pos ? pos : home, far: !!pos && !near };
}

export function useMyStats() {
  const [stats, setStats] = useState<MyStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.myStats().then(setStats).catch((e: Error) => setError(e.message));
  }, []);
  return { stats, error };
}
