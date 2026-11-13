import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { Donation, User } from '../../lib/types';

export interface VolunteerState {
  user: User;
  active: Donation | null;
  activeLoaded: boolean;
  setActive: (d: Donation | null) => void;
  skipped: number[];
  setSkipped: Dispatch<SetStateAction<number[]>>;
  setOnDuty: (on: boolean) => Promise<void>;
  updateProfile: (patch: { name?: string; vehicle?: string }) => Promise<boolean>;
}

export const VolunteerContext = createContext<VolunteerState | null>(null);

export function useVolunteer() {
  const ctx = useContext(VolunteerContext);
  if (!ctx) throw new Error('useVolunteer must be used inside VolunteerApp');
  return ctx;
}
