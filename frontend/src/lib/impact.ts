import { dateLocale, type T } from './i18n';
import type { Role } from './types';

export const roleWording: Record<Role, string> = {
  VOLUNTEER: 'Volunteer',
  DONOR: 'Food donor',
  NGO: 'Partner kitchen',
};

const BADGES = ['Bronze', 'Silver', 'Gold Rescuer', 'Platinum'];

// Badge names come from the server; the known ones are translated, any other is shown as sent
export const badgeName = (name: string, t: T) => (BADGES.includes(name) ? t(name) : name);

export const kgText = (kg: number) => `${kg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`;

// The current month in the UI language, in place of the English month name the server sends
export const monthName = (d = new Date()) => d.toLocaleDateString(dateLocale(), { month: 'long' });

export const longDate = (value: string | Date) =>
  new Date(value).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' });
