import { useEffect, useRef, useState } from 'react';
import { api, tokenStore } from './api';
import type { Activity, Donation, LocationEvent } from './types';

interface StreamHandlers {
  donation?: (d: Donation) => void;
  location?: (l: LocationEvent) => void;
  activity?: (a: Activity) => void;
}

type Listener = { [K in keyof StreamHandlers]: StreamHandlers[K] };

const listeners = new Set<Listener>();
const statusListeners = new Set<(live: boolean) => void>();
let source: EventSource | null = null;
let live = false;

function setLive(v: boolean) {
  live = v;
  statusListeners.forEach((fn) => fn(v));
}

// Open one shared EventSource; the browser reconnects on its own after drops
function ensureSource() {
  if (source || !tokenStore.get()) return;
  source = new EventSource(api.streamUrl());
  source.onopen = () => setLive(true);
  source.onerror = () => setLive(false);
  (['donation', 'location', 'activity'] as const).forEach((type) => {
    source!.addEventListener(type, (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      listeners.forEach((l) => (l[type] as ((x: unknown) => void) | undefined)?.(data));
    });
  });
}

function closeIfIdle() {
  if (listeners.size === 0 && source) {
    source.close();
    source = null;
    setLive(false);
  }
}

export function useStream(handlers: StreamHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const l: Listener = {
      donation: (d) => ref.current.donation?.(d),
      location: (x) => ref.current.location?.(x),
      activity: (a) => ref.current.activity?.(a),
    };
    listeners.add(l);
    ensureSource();
    return () => {
      listeners.delete(l);
      closeIfIdle();
    };
  }, []);
}

export function useStreamStatus() {
  const [state, setState] = useState(live);
  useEffect(() => {
    statusListeners.add(setState);
    return () => {
      statusListeners.delete(setState);
    };
  }, []);
  return state;
}
