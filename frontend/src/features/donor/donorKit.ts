import type { Category, Donation, Status, Unit } from '../../lib/types';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const QUARTER = 15 * MINUTE;

export const LIVE_STATUSES: Status[] = ['AVAILABLE', 'ACCEPTED', 'CLAIMED', 'PICKED_UP'];
export const isLive = (d: Donation) => LIVE_STATUSES.includes(d.status);

export const mealsFor = (quantity: number, unit: Unit) => (unit === 'KG' ? quantity * 3 : quantity);
export const weightFor = (quantity: number, unit: Unit) => (unit === 'SERVINGS' ? quantity * 0.3 : unit === 'KG' ? quantity : quantity * 0.25);
export const co2For = (kg: number) => kg * 2.5;

export const shelfLife: Record<Category, { hours: number; noun: string }> = {
  COOKED: { hours: 4, noun: 'cooked food' },
  BAKERY: { hours: 24, noun: 'bakery items' },
  FRUIT_VEG: { hours: 48, noun: 'fruit and veg' },
  PACKAGED: { hours: 72, noun: 'packaged food' },
  RAW: { hours: 72, noun: 'raw ingredients' },
};

export const firstName = (name?: string) => (name ? name.split(/\s+/)[0] : 'The volunteer');

export function clockTime(d: Date | string | number) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
}

export function dayWord(iso: Date | string | number, now = Date.now()) {
  const d = new Date(iso);
  const days = Math.round((new Date(d.toDateString()).getTime() - new Date(new Date(now).toDateString()).getTime()) / DAY);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1 && days < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const dayTime = (iso: Date | string | number, now = Date.now()) => `${dayWord(iso, now)}, ${clockTime(iso)}`;

export function pickupWindow(from: string, until: string) {
  if (!from || !until) return 'Not set';
  const sameDay = new Date(from).toDateString() === new Date(until).toDateString();
  return sameDay ? `${dayWord(from)}, ${clockTime(from)} to ${clockTime(until)}` : `${dayTime(from)} to ${dayTime(until)}`;
}

// "today", "tomorrow", "Saturday" or "13 Nov" for use inside a sentence
export function dayPhrase(iso: Date | string | number, now = Date.now()) {
  const w = dayWord(iso, now);
  return w === 'Today' || w === 'Tomorrow' || w === 'Yesterday' ? w.toLowerCase() : w;
}

export const whenPhrase = (d: Date | string | number) => `${dayPhrase(d)} ${clockTime(d)}`;

const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d: Date | string | number) => {
  const x = new Date(d);
  return `${String(x.getFullYear()).padStart(4, '0')}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
export const timeKey = (iso: string) => {
  const d = new Date(iso);
  return !iso || Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Local date and clock time as an ISO string, or empty when either part is missing
export function joinDateTime(date: string, hhmm: string) {
  if (!date || !hhmm) return '';
  const d = new Date(`${date}T${hhmm}`);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export const roundQuarter = (t: number, up: boolean) => (up ? Math.ceil(t / QUARTER) : Math.floor(t / QUARTER)) * QUARTER;

// Today, Tomorrow, then the next five days as "Sat 15"
export function dayChips(now = Date.now()) {
  const d0 = new Date(now);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${d.toLocaleDateString('en-IN', { weekday: 'short' })} ${d.getDate()}`;
    return { key: dateKey(d), label };
  });
}

export const kgLabel = (kg: number) => `${kg >= 10 ? Math.round(kg) : Math.round(kg * 10) / 10} kg`;

export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// One short line that says where a donation is in its journey
export function statusText(d: Donation) {
  const who = firstName(d.volunteer?.name);
  switch (d.status) {
    case 'AVAILABLE':
      return 'Waiting for a kitchen';
    case 'ACCEPTED':
      return `${d.ngo?.name ?? 'A kitchen'} accepted. Waiting for a volunteer.`;
    case 'CLAIMED':
      return `${who} is on the way`;
    case 'PICKED_UP':
      return d.ngo ? `Picked up, heading to ${d.ngo.name}` : 'Picked up';
    case 'DELIVERED':
      return d.ngo ? `Delivered to ${d.ngo.name}` : 'Delivered';
    case 'EXPIRED':
      return 'Expired before pickup';
    default:
      return 'Cancelled';
  }
}
