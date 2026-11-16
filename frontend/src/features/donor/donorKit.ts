import { dateLocale, fill, type T } from '../../lib/i18n';
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

export const firstName = (name?: string, t: T = fill) => (name ? name.split(/\s+/)[0] : t('The volunteer'));

export function clockTime(d: Date | string | number) {
  return new Date(d).toLocaleTimeString(dateLocale(), { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
}

const daysFrom = (d: Date, now: number) => Math.round((new Date(d.toDateString()).getTime() - new Date(new Date(now).toDateString()).getTime()) / DAY);

export function dayWord(iso: Date | string | number, t: T = fill, now = Date.now()) {
  const d = new Date(iso);
  const days = daysFrom(d, now);
  if (days === 0) return t('Today');
  if (days === 1) return t('Tomorrow');
  if (days === -1) return t('Yesterday');
  if (days > 1 && days < 7) return d.toLocaleDateString(dateLocale(), { weekday: 'long' });
  return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
}

export const dayTime = (iso: Date | string | number, t: T = fill, now = Date.now()) => `${dayWord(iso, t, now)}, ${clockTime(iso)}`;

export function pickupWindow(from: string, until: string, t: T = fill) {
  if (!from || !until) return t('Not set');
  const sameDay = new Date(from).toDateString() === new Date(until).toDateString();
  return sameDay
    ? t('{day}, {from} to {until}', { day: dayWord(from, t), from: clockTime(from), until: clockTime(until) })
    : t('{from} to {until}', { from: dayTime(from, t), until: dayTime(until, t) });
}

// "today", "tomorrow", "Saturday" or "13 Nov" for use inside a sentence
export function dayPhrase(iso: Date | string | number, t: T = fill, now = Date.now()) {
  const days = daysFrom(new Date(iso), now);
  if (days === 0) return t('today');
  if (days === 1) return t('tomorrow');
  if (days === -1) return t('yesterday');
  return dayWord(iso, t, now);
}

export const whenPhrase = (d: Date | string | number, t: T = fill) => `${dayPhrase(d, t)} ${clockTime(d)}`;

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
export function dayChips(now = Date.now(), t: T = fill) {
  const d0 = new Date(now);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
    const label = i === 0 ? t('Today') : i === 1 ? t('Tomorrow') : `${d.toLocaleDateString(dateLocale(), { weekday: 'short' })} ${d.getDate()}`;
    return { key: dateKey(d), label };
  });
}

export const kgLabel = (kg: number) => `${kg >= 10 ? Math.round(kg) : Math.round(kg * 10) / 10} kg`;

export function greeting(t: T = fill, now = new Date()) {
  const h = now.getHours();
  return t(h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
}

// One short line that says where a donation is in its journey
export function statusText(d: Donation, t: T = fill) {
  const who = firstName(d.volunteer?.name, t);
  switch (d.status) {
    case 'AVAILABLE':
      return t('Waiting for a kitchen');
    case 'ACCEPTED':
      return d.ngo ? t('{ngo} accepted. Waiting for a volunteer.', { ngo: d.ngo.name }) : t('A kitchen accepted. Waiting for a volunteer.');
    case 'CLAIMED':
      return t('{name} is on the way', { name: who });
    case 'PICKED_UP':
      return d.ngo ? t('Picked up, heading to {ngo}', { ngo: d.ngo.name }) : t('Picked up');
    case 'DELIVERED':
      return d.ngo ? t('Delivered to {ngo}', { ngo: d.ngo.name }) : t('Delivered');
    case 'EXPIRED':
      return t('Expired before pickup');
    default:
      return t('Cancelled');
  }
}
