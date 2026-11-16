import { useEffect, useState } from 'react';
import { api } from './api';

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// VAPID keys travel as unpadded base64url; PushManager wants the raw bytes
export function keyBytes(base64url: string) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function current() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function save(sub: PushSubscription) {
  const { keys } = sub.toJSON();
  await api.pushSubscribe({ endpoint: sub.endpoint, keys: { p256dh: keys?.p256dh ?? '', auth: keys?.auth ?? '' } });
}

export async function pushIsOn() {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  return (await current()) !== null;
}

// Resolves false when the server has push off or the person declines the browser prompt
export async function enablePush() {
  const { enabled, publicKey } = await api.pushKey();
  if (!enabled || !publicKey) return false;
  if ((await Notification.requestPermission()) !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await save(sub);
  return true;
}

export async function disablePush() {
  const sub = await current();
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint).catch(() => undefined);
  await sub.unsubscribe();
}

export interface PushSetting {
  on: boolean;
  busy: boolean;
  blocked: boolean;
  toggle: (next: boolean) => Promise<void>;
}

// Null while loading or when push is unavailable; an existing subscription is re-saved so it follows whoever is signed in
export function usePushSetting(onError: (message: string) => void): PushSetting | null {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    let live = true;
    api
      .pushKey()
      .then(async ({ enabled }) => {
        if (!enabled) return;
        const sub = (await pushIsOn()) ? await current() : null;
        if (sub) await save(sub).catch(() => undefined);
        if (live) setOn(sub !== null);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (on === null) return null;
  return {
    on,
    busy,
    blocked: Notification.permission === 'denied',
    toggle: async (next) => {
      setBusy(true);
      try {
        if (next) setOn(await enablePush());
        else {
          await disablePush();
          setOn(false);
        }
      } catch {
        onError('Couldn’t change notifications, try again');
      } finally {
        setBusy(false);
      }
    },
  };
}
