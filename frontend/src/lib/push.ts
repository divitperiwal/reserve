import { useEffect, useState } from 'react';
import { api } from './api';
import { useT } from './i18n';

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
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function save(sub: PushSubscription) {
  const { keys } = sub.toJSON();
  await api.pushSubscribe({ endpoint: sub.endpoint, keys: { p256dh: keys?.p256dh ?? '', auth: keys?.auth ?? '' } });
}

// On only when this browser is subscribed and the server has the subscription under the signed-in user
export async function pushIsOn() {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const sub = await current();
  return sub !== null && (await api.pushSubscribed(sub.endpoint)).subscribed;
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

// Called on sign-out with the token that is about to be cleared, so the next person on this browser gets none of these alerts
export async function forgetPush(token: string | null) {
  if (!token || !pushSupported()) return;
  const sub = await current();
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint, token).catch(() => undefined);
  await sub.unsubscribe().catch(() => undefined);
}

export interface PushSetting {
  on: boolean;
  busy: boolean;
  blocked: boolean;
  toggle: (next: boolean) => Promise<void>;
}

// Null while loading or when push is unavailable
export function usePushSetting(onError: (message: string) => void): PushSetting | null {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!pushSupported()) return;
    let live = true;
    api
      .pushKey()
      .then(async ({ enabled }) => {
        if (!enabled) return;
        const on = await pushIsOn();
        if (live) setOn(on);
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
        onError(t('Couldn’t change notifications, try again'));
      } finally {
        setBusy(false);
      }
    },
  };
}
