import { dateLocale, fill, type T } from './i18n';

const clock = (d: Date) => d.toLocaleTimeString(dateLocale(), d.getMinutes() ? { hour: 'numeric', minute: '2-digit' } : { hour: 'numeric' });

export function slotWords(from: string, until: string, t: T = fill) {
  const start = new Date(from);
  return t('{day} {from} to {until}', { day: start.toLocaleDateString(dateLocale(), { weekday: 'short' }), from: clock(start), until: clock(new Date(until)) });
}

export const pointRadius = (kg: number) => Math.max(5, Math.min(28, 4 + 2.5 * Math.sqrt(kg)));
