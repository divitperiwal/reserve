import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { haversineKm } from '../../lib/format';
import { useStream } from '../../lib/stream';
import type { Donation } from '../../lib/types';

interface DeliveriesState {
  items: Donation[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  upsert: (d: Donation) => void;
  remove: (id: number) => void;
}

const DeliveriesContext = createContext<DeliveriesState | null>(null);

// Late when handed over (or still pending) after the best-before time
export const pastBestBefore = (d: Donation, at = Date.now()) => at > +new Date(d.bestBefore);
export const lateText = 'Past best-before. Check the food before serving.';

export const isWaiting = (d: Donation) => d.status === 'ACCEPTED';
export const isOnTheWay = (d: Donation) => d.status === 'CLAIMED' || d.status === 'PICKED_UP';

export function DeliveriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    api
      .mine()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  // Stream payloads have codes stripped, so keep any fields we already know
  const upsert = useCallback((d: Donation) => {
    setItems((xs) => {
      const i = xs.findIndex((x) => x.id === d.id);
      if (i === -1) return [d, ...xs];
      const next = xs.slice();
      next[i] = { ...xs[i], ...d, lastLocation: d.lastLocation ?? xs[i]!.lastLocation };
      return next;
    });
  }, []);

  const remove = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  useStream({
    donation: (d) => {
      const mine = d.ngo?.id === user?.id && d.status !== 'AVAILABLE' && d.status !== 'EXPIRED' && d.status !== 'CANCELLED';
      // Given back, expired or cancelled food leaves this kitchen's list
      if (mine) upsert(d);
      else remove(d.id);
    },
    location: (l) =>
      setItems((xs) => xs.map((x) => (x.id === l.donationId ? { ...x, lastLocation: { lat: l.lat, lng: l.lng, at: l.at } } : x))),
  });

  const value = useMemo(() => ({ items, loading, error, reload, upsert, remove }), [items, loading, error, reload, upsert, remove]);
  return <DeliveriesContext.Provider value={value}>{children}</DeliveriesContext.Provider>;
}

export function useDeliveries() {
  const ctx = useContext(DeliveriesContext);
  if (!ctx) throw new Error('useDeliveries must be used inside DeliveriesProvider');
  return ctx;
}

export function useOnTheWay() {
  const { items, ...rest } = useDeliveries();
  const list = useMemo(
    () => items.filter(isOnTheWay).sort((a, b) => +new Date(a.bestBefore) - +new Date(b.bestBefore)),
    [items],
  );
  return { list, ...rest };
}

export function useWaiting() {
  const { items } = useDeliveries();
  const list = useMemo(() => items.filter(isWaiting).sort((a, b) => +new Date(a.pickupUntil) - +new Date(b.pickupUntil)), [items]);
  return { list };
}

const RIDE_KMH = 18;

// Rider to donor (if not yet picked up) then donor to the kitchen, straight line at riding speed
export function etaMinutes(d: Donation, ngo: { lat: number; lng: number }): number {
  const donor = { lat: d.lat, lng: d.lng };
  const rider = d.lastLocation ?? donor;
  const km = d.status === 'PICKED_UP' ? haversineKm(rider, ngo) : haversineKm(rider, donor) + haversineKm(donor, ngo);
  return Math.max(1, Math.round((km / RIDE_KMH) * 60));
}

export function away(min: number): string {
  const m = Math.max(1, Math.round(min));
  if (m < 60) return `about ${m} min away`;
  const h = Math.floor(m / 60);
  return m % 60 ? `about ${h} h ${m % 60} min away` : `about ${h} h away`;
}

export const firstName = (name: string) => name.split(/\s+/)[0] ?? name;
