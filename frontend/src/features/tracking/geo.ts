import { haversineKm } from '../../lib/format';
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

// Distance and minutes from the rider to the next stop, plus how far along the current leg they are
export function leg(d: Donation, trail: GeoPoint[], fallback?: LatLng | null) {
  const stop = nextStop(d);
  const from = riderAt(d, trail) ?? fallback ?? null;
  if (!stop || !from) return null;
  const km = haversineKm(from, stop);
  const start = d.status === 'PICKED_UP' ? { lat: d.lat, lng: d.lng } : trail[0] ?? from;
  const total = haversineKm(start, stop);
  const progress = total > 0.01 ? Math.min(1, Math.max(0, 1 - km / total)) : km < 0.05 ? 1 : 0;
  return { km, min: etaMin(km), progress, stop };
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
