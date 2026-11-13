import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useStream } from '../../lib/stream';
import type { Donation, GeoPoint, Status } from '../../lib/types';

// Stream payloads have codes stripped, so keep the ones we already know
export function mergeDonation(prev: Donation | null, next: Donation): Donation {
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    pickupCode: next.pickupCode ?? prev.pickupCode,
    dropCode: next.dropCode ?? prev.dropCode,
    distanceKm: next.distanceKm ?? prev.distanceKm,
    lastLocation: next.lastLocation ?? prev.lastLocation,
  };
}

const samePoint = (a: GeoPoint, b: GeoPoint) => Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;

export function useTracking(id: number, onStatus?: (next: Status, prev: Status, d: Donation) => void) {
  const [donation, setDonation] = useState<Donation | null>(null);
  const [trail, setTrail] = useState<GeoPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = useRef<Donation | null>(null);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    let live = true;
    setError(null);
    Promise.all([api.donation(id), api.route(id).catch(() => [] as GeoPoint[])])
      .then(([d, route]) => {
        if (!live) return;
        current.current = d;
        setDonation(d);
        setTrail(route);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [id, attempt]);

  const update = useCallback((next: Donation) => {
    const prev = current.current;
    const merged = mergeDonation(prev, next);
    current.current = merged;
    setDonation(merged);
    if (prev && prev.status !== merged.status) onStatusRef.current?.(merged.status, prev.status, merged);
  }, []);

  const pushPoint = useCallback((p: GeoPoint) => {
    setTrail((t) => {
      const last = t[t.length - 1];
      return last && samePoint(last, p) ? t : [...t, p];
    });
  }, []);

  useStream({
    donation: (d) => {
      if (d.id === id) update(d);
    },
    location: (l) => {
      if (l.donationId !== id) return;
      const point = { lat: l.lat, lng: l.lng, at: l.at };
      pushPoint(point);
      if (current.current) {
        current.current = { ...current.current, lastLocation: point };
        setDonation(current.current);
      }
    },
  });

  return {
    donation,
    trail,
    error,
    loading: !donation && !error,
    update,
    pushPoint,
    retry: () => setAttempt((a) => a + 1),
  };
}
