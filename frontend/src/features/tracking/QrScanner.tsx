import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n';
import s from './stage.module.css';

const MAX_SIDE = 640;
const FRAME_MS = 100;

function failureText(err: unknown) {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access was denied. Allow it in your browser settings, or type the code instead.';
  return 'No camera is available here. Type the code instead.';
}

export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const t = useT();
  const onScanRef = useRef(onScan);
  const [failure, setFailure] = useState<string | null>(() => ('getUserMedia' in (navigator.mediaDevices ?? {}) ? null : failureText(null)));

  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    let live = true;
    let stream: MediaStream | null = null;
    let frame = 0;
    let last = 0;
    const stop = () => {
      live = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };

    if (!navigator.mediaDevices) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tick = (now: number) => {
      const v = video.current;
      if (!live || !v || !ctx) return;
      if (now - last >= FRAME_MS && v.readyState >= v.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
        last = now;
        const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (hit?.data) {
          stop();
          onScanRef.current(hit.data);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (media) => {
        if (!live) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = media;
        const v = video.current;
        if (!v) return;
        v.srcObject = media;
        await v.play();
        frame = requestAnimationFrame(tick);
      })
      .catch((err) => {
        if (!live) return;
        stop();
        setFailure(failureText(err));
      });

    return stop;
  }, []);

  if (failure) {
    return (
      <p role="alert" className={s.codeError}>
        {t(failure)}
      </p>
    );
  }
  return (
    <div className={s.scanner}>
      <video ref={video} className={s.scannerVideo} muted playsInline aria-label={t('Camera preview')} />
      <p className={s.scannerHint}>{t('Point the camera at the QR code on the volunteer’s phone.')}</p>
    </div>
  );
}
