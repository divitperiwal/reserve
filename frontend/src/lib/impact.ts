import type { Role } from './types';

export const roleWording: Record<Role, string> = {
  VOLUNTEER: 'Volunteer',
  DONOR: 'Food donor',
  NGO: 'Partner kitchen',
};

export const kgText = (kg: number) => `${kg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`;

export const longDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
