import { describe, expect, it } from 'vitest';
import { pathKm, pointAlong, remainingKm } from './route';

const path = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 0.01 },
  { lat: 0, lng: 0.02 },
];
const KM = pathKm(path) / 2;

describe('pathKm', () => {
  it('sums the segment lengths', () => {
    expect(KM).toBeCloseTo(1.112, 2);
    expect(pathKm(path)).toBeCloseTo(2.224, 2);
  });

  it('is zero for an empty or single point path', () => {
    expect(pathKm([])).toBe(0);
    expect(pathKm([path[0]!])).toBe(0);
  });
});

describe('pointAlong', () => {
  it('interpolates inside a segment', () => {
    expect(pointAlong(path, KM / 2).lng).toBeCloseTo(0.005, 4);
  });

  it('crosses vertices', () => {
    expect(pointAlong(path, KM * 1.5).lng).toBeCloseTo(0.015, 4);
  });

  it('clamps to the start and the end', () => {
    expect(pointAlong(path, 0)).toEqual(path[0]);
    expect(pointAlong(path, 50)).toEqual(path[2]);
  });
});

describe('remainingKm', () => {
  it('measures from the vertex nearest the position', () => {
    expect(remainingKm(path, { lat: 0, lng: 0.0102 })).toBeCloseTo(KM, 3);
  });

  it('is the whole path at the start and zero at the end', () => {
    expect(remainingKm(path, path[0]!)).toBeCloseTo(2 * KM, 3);
    expect(remainingKm(path, { lat: 0, lng: 0.5 })).toBe(0);
  });
});
