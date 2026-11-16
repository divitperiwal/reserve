import { fill, type T } from './i18n';
import type { Category, Donation, Status, Unit } from './types';

export const categoryLabel: Record<Category, string> = {
  COOKED: 'Cooked meal',
  BAKERY: 'Bakery',
  FRUIT_VEG: 'Fruit & veg',
  PACKAGED: 'Packaged',
  RAW: 'Raw ingredients',
};

export const unitLabel: Record<Unit, string> = { SERVINGS: 'servings', KG: 'kg', PACKS: 'packs' };
const unitOne: Record<Unit, string> = { SERVINGS: 'serving', KG: 'kg', PACKS: 'pack' };

// Unit word for an amount, singular for one; kg is never translated
export const unitName = (u: Unit, t: T = fill, n = 2) => (u === 'KG' ? 'kg' : t(n === 1 ? unitOne[u] : unitLabel[u]));

export const statusLabel: Record<Status, string> = {
  AVAILABLE: 'Needs a kitchen',
  ACCEPTED: 'Needs a volunteer',
  CLAIMED: 'Claimed',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Delivered',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

export const qty = (d: Pick<Donation, 'quantity' | 'unit'>, t: T = fill) => `${d.quantity} ${unitName(d.unit, t, d.quantity)}`;

export const km = (n?: number) => (n === undefined ? '' : `${n < 10 ? n.toFixed(1) : Math.round(n)} km`);

export const num = (n: number) => n.toLocaleString('en-IN');

export const tonnes = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`);

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const NO_LOCATION = 'Location isn’t available on this device.';
export const LOCATION_DENIED = 'Allow location access, or type your address instead.';

export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error(NO_LOCATION));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error(LOCATION_DENIED)),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}
