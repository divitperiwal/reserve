import QRCode from 'qrcode';
import { ScanLine } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button, cx, Sheet } from '../../components/ui';
import { formatHandover, parseHandover } from './handover';
import { QrScanner } from './QrScanner';
import s from './stage.module.css';

export function CodeQr({ donationId, code, label }: { donationId: number; code: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(formatHandover(donationId, code), { width: 480, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
  }, [donationId, code]);

  if (!src) return null;
  return <img className={s.qr} src={src} alt={`${label} QR code`} width={192} height={192} />;
}

export function CodeTiles({ code, label }: { code: string; label: string }) {
  return (
    <span className={s.tiles} role="img" aria-label={`${label} ${code.split('').join(' ')}`}>
      {code.split('').map((c, i) => (
        <span key={i} className={s.tile}>
          {c}
        </span>
      ))}
    </span>
  );
}

interface CodeSheetProps {
  open: boolean;
  donationId: number;
  onClose: () => void;
  title: string;
  hint: string;
  warning?: string;
  onSubmit: (code: string) => Promise<void>;
}

// Four-digit code entry; the real input sits over the tiles so typing, paste and autofill all work
export function CodeSheet({ open, donationId, onClose, title, hint, warning, onSubmit }: CodeSheetProps) {
  const id = useId();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (open) {
      setCode('');
      setError(null);
      setScanning(false);
    }
  }, [open]);

  const run = async (value: string) => {
    if (value.length !== 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(value);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(code);
  };

  const scanned = (text: string) => {
    setScanning(false);
    const hit = parseHandover(text);
    if (!hit) return setError('That QR code is not a ReServe handover code.');
    if (hit.donationId !== donationId) return setError('This code is for a different pickup');
    setCode(hit.code);
    void run(hit.code);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button type="submit" form={id} size="lg" block loading={busy} disabled={code.length !== 4}>
          {title}
        </Button>
      }
    >
      <form id={id} onSubmit={submit} className={s.codeForm}>
        <p className={s.codeHint}>{hint}</p>
        {warning && <p className={s.codeError}>{warning}</p>}
        <label className={s.entry}>
          <span className="sr-only">4-digit code</span>
          <input
            className={s.entryInput}
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={4}
            value={code}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
              setError(null);
              setScanning(false);
            }}
          />
          <span className={s.tiles} aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cx(s.tile, s.tileEntry, i === Math.min(code.length, 3) && s.tileNow, error && s.tileError)}>
                {code[i] ?? ''}
              </span>
            ))}
          </span>
        </label>
        {error && (
          <p id={`${id}-err`} role="alert" className={s.codeError}>
            {error}
          </p>
        )}
        {scanning ? (
          <QrScanner onScan={scanned} />
        ) : (
          <Button
            variant="secondary"
            block
            disabled={busy}
            icon={<ScanLine size={18} strokeWidth={2} aria-hidden />}
            onClick={() => {
              setError(null);
              setScanning(true);
            }}
          >
            Scan code
          </Button>
        )}
      </form>
    </Sheet>
  );
}
