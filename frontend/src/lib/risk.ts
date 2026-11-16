import { etaMin, type LatLng } from '../features/tracking/geo';
import { haversineKm } from './format';
import type { Donation } from './types';

export type RiskLevel = 'SAFE' | 'TIGHT' | 'AT_RISK';

export const HANDOVER_MIN = 10;
export const DISPATCH_MIN = 15;
const TIGHT_MIN = 30;
const MIN_MS = 60_000;

export interface RiskOpts {
  now?: number;
  from?: LatLng | null;
  kitchen?: LatLng | null;
  toDonorMin?: number;
  toKitchenMin?: number;
}

const ride = (a: LatLng | null | undefined, b: LatLng | null | undefined) => (a && b ? etaMin(haversineKm(a, b)) : DISPATCH_MIN);

// How much time is left over once the food has reached a kitchen, and how worried to be
export function rescueRisk(d: Donation, opts: RiskOpts = {}): { level: RiskLevel; spareMin: number } {
  const now = opts.now ?? Date.now();
  const pickedUp = d.status === 'PICKED_UP';
  const kitchen = d.status === 'AVAILABLE' ? opts.kitchen : d.ngo;
  const toDonor = opts.toDonorMin ?? ride(opts.from, d);
  const toKitchen = opts.toKitchenMin ?? ride(pickedUp ? (opts.from ?? d) : d, kitchen);
  const total = pickedUp ? toKitchen + HANDOVER_MIN : toDonor + HANDOVER_MIN + toKitchen + HANDOVER_MIN;
  const spareMin = (new Date(d.bestBefore).getTime() - (now + total * MIN_MS)) / MIN_MS;
  const missesWindow = !pickedUp && now + toDonor * MIN_MS > new Date(d.pickupUntil).getTime();
  const level = missesWindow || spareMin < 0 ? 'AT_RISK' : spareMin < TIGHT_MIN ? 'TIGHT' : 'SAFE';
  return { level, spareMin: Math.round(spareMin) };
}
