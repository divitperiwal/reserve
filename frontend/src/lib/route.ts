import { useEffect, useState } from 'react';
import type { LatLng } from '../features/tracking/geo';
import { haversineKm } from './format';

export interface RoadRoute {
  path: LatLng[];
  km: number;
  min: number;
}

const OSRM = import.meta.env.VITE_OSRM_URL ?? 'https://router.project-osrm.org';
const TIMEOUT_MS = 6000;
const MOVE_KM = 0.05;

const cache = new Map<string, Promise<RoadRoute | null>>();

export function pathKm(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += haversineKm(path[i - 1]!, path[i]!);
  return total;
}

// The point km along the path, clamped to the end
export function pointAlong(path: LatLng[], km: number): LatLng {
  let left = km;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const seg = haversineKm(a, b);
    if (left <= seg && seg > 0) {
      const t = left / seg;
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
    left -= seg;
  }
  return path[path.length - 1]!;
}

// The path from the vertex nearest pos to the end
export function remainingPath(path: LatLng[], pos: LatLng): LatLng[] {
  let nearest = 0;
  let best = Infinity;
  path.forEach((p, i) => {
    const d = haversineKm(p, pos);
    if (d < best) {
      best = d;
      nearest = i;
    }
  });
  return path.slice(nearest);
}

export const remainingKm = (path: LatLng[], pos: LatLng) => pathKm(remainingPath(path, pos));

async function fetchRoute(points: LatLng[]): Promise<RoadRoute | null> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const res = await fetch(`${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson`, { signal: ctl.signal });
    if (!res.ok) return null;
    const body = (await res.json()) as { routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
    const r = body.routes?.[0];
    if (!r || r.geometry.coordinates.length < 2) return null;
    return { path: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })), km: r.distance / 1000, min: r.duration / 60 };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export function roadRoute(points: LatLng[]): Promise<RoadRoute | null> {
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';');
  let hit = cache.get(key);
  if (!hit) {
    hit = fetchRoute(points).then((r) => {
      if (!r) cache.delete(key);
      return r;
    });
    cache.set(key, hit);
  }
  return hit;
}

interface Ends {
  from: LatLng;
  to: LatLng;
}

// Refetches only when an end moves more than 50 m
export function useRoadRoute(from: LatLng | null, to: LatLng | null): RoadRoute | null {
  const [ends, setEnds] = useState<Ends | null>(null);
  const [done, setDone] = useState<{ ends: Ends; route: RoadRoute | null } | null>(null);

  if (!from || !to) {
    if (ends) setEnds(null);
  } else if (!ends || haversineKm(ends.from, from) >= MOVE_KM || haversineKm(ends.to, to) >= MOVE_KM) {
    setEnds({ from, to });
  }

  useEffect(() => {
    if (!ends) return;
    let live = true;
    roadRoute([ends.from, ends.to]).then((route) => live && setDone({ ends, route }));
    return () => {
      live = false;
    };
  }, [ends]);

  return done?.ends === ends ? done.route : null;
}
