import { describe, expect, it } from 'vitest';
import { etaMin } from '../features/tracking/geo';
import { haversineKm } from './format';
import { DISPATCH_MIN, HANDOVER_MIN, rescueRisk } from './risk';
import type { Donation } from './types';

const NOW = Date.parse('2026-01-01T10:00:00Z');
const at = (min: number) => new Date(NOW + min * 60_000).toISOString();
const donor = { lat: 12.97, lng: 77.59 };
const kitchen = { lat: 12.97, lng: 77.64 };

const food = (over: Partial<Donation> = {}) =>
  ({ ...donor, status: 'AVAILABLE', bestBefore: at(240), pickupUntil: at(120), ...over }) as Donation;

describe('rescueRisk', () => {
  it('counts dispatch, both handovers and the ride for an unclaimed donation', () => {
    const r = rescueRisk(food(), { now: NOW, kitchen, toKitchenMin: 20 });
    expect(r.spareMin).toBe(240 - (DISPATCH_MIN + HANDOVER_MIN + 20 + HANDOVER_MIN));
    expect(r.level).toBe('SAFE');
  });

  it('rides from the volunteer when a position is known', () => {
    const from = { lat: 12.97, lng: 77.54 };
    const r = rescueRisk(food({ status: 'CLAIMED', ngo: { ...kitchen } as Donation['ngo'] }), { now: NOW, from });
    const toDonor = etaMin(haversineKm(from, donor));
    const toKitchen = etaMin(haversineKm(donor, kitchen));
    expect(r.spareMin).toBe(240 - (toDonor + HANDOVER_MIN + toKitchen + HANDOVER_MIN));
  });

  it('is tight under 30 minutes spare and at risk below zero', () => {
    expect(rescueRisk(food({ bestBefore: at(70) }), { now: NOW, kitchen, toKitchenMin: 20 }).level).toBe('TIGHT');
    expect(rescueRisk(food({ bestBefore: at(40) }), { now: NOW, kitchen, toKitchenMin: 20 }).level).toBe('AT_RISK');
  });

  it('is at risk when the volunteer would reach the donor after the pickup window', () => {
    const r = rescueRisk(food({ pickupUntil: at(10), bestBefore: at(600) }), { now: NOW, kitchen, toDonorMin: 25, toKitchenMin: 5 });
    expect(r.level).toBe('AT_RISK');
    expect(r.spareMin).toBeGreaterThan(30);
  });

  it('only needs the kitchen leg and a handover once picked up', () => {
    const r = rescueRisk(food({ status: 'PICKED_UP', ngo: { ...kitchen } as Donation['ngo'], pickupUntil: at(-60) }), { now: NOW, toKitchenMin: 12 });
    expect(r.spareMin).toBe(240 - (12 + HANDOVER_MIN));
    expect(r.level).toBe('SAFE');
  });

  it('treats an unknown kitchen as a dispatch-length leg', () => {
    expect(rescueRisk(food(), { now: NOW }).spareMin).toBe(240 - (DISPATCH_MIN + HANDOVER_MIN + DISPATCH_MIN + HANDOVER_MIN));
  });
});
