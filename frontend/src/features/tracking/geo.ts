import { haversineKm } from '../../lib/format';
import { remainingKm, type RoadRoute } from '../../lib/route';
import type { Donation, GeoPoint, Status } from '../../lib/types';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Stop extends LatLng {
  name: string;
}

const SPEED_KMH = 18;

export const isActive = (s: Status) => s === 'CLAIMED' || s === 'PICKED_UP';

export const etaMin = (distKm: number) => Math.max(1, Math.round((distKm / SPEED_KMH) * 60));

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function span(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function nextStop(d: Donation): Stop | null {
  if (d.status === 'AVAILABLE' || d.status === 'ACCEPTED' || d.status === 'CLAIMED') return { lat: d.lat, lng: d.lng, name: d.donor.name };
  if (d.status === 'PICKED_UP' && d.ngo) return { lat: d.ngo.lat, lng: d.ngo.lng, name: d.ngo.name };
  return null;
}

export function riderAt(d: Donation, trail: GeoPoint[]): GeoPoint | null {
  return trail[trail.length - 1] ?? d.lastLocation ?? null;
}

// Where the current leg starts and ends, for road routing
export function legEnds(d: Donation, trail: GeoPoint[], fallback?: LatLng | null): { from: LatLng; to: LatLng } | null {
  if (!isActive(d.status)) return null;
  const stop = nextStop(d);
  const from = d.status === 'PICKED_UP' ? d : trail[0] ?? riderAt(d, trail) ?? fallback;
  return stop && from ? { from: { lat: from.lat, lng: from.lng }, to: { lat: stop.lat, lng: stop.lng } } : null;
}

// Distance and minutes from the rider to the next stop, along the road when a route is known
export function leg(d: Donation, trail: GeoPoint[], fallback?: LatLng | null, route?: RoadRoute | null) {
  const stop = nextStop(d);
  const from = riderAt(d, trail) ?? fallback ?? null;
  if (!stop || !from) return null;
  const straight = haversineKm(from, stop);
  const road = route && route.km > 0 ? route : null;
  const km = road ? remainingKm(road.path, from) : straight;
  const min = road ? Math.max(1, Math.round((road.min * km) / road.km)) : etaMin(km);
  const start = d.status === 'PICKED_UP' ? { lat: d.lat, lng: d.lng } : trail[0] ?? from;
  const total = haversineKm(start, stop);
  const progress = total > 0.01 ? Math.min(1, Math.max(0, 1 - straight / total)) : straight < 0.05 ? 1 : 0;
  return { km, min, progress, stop };
}

export function routeKm(d: Donation) {
  return d.ngo ? haversineKm(d, d.ngo) : null;
}

export function stepToward(from: LatLng, to: LatLng, km: number): LatLng {
  const dist = haversineKm(from, to);
  if (dist <= km) return { lat: to.lat, lng: to.lng };
  const t = km / dist;
  return { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t };
}
