import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button, cx, Sheet } from '../../components/ui';
import s from './stage.module.css';

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
  onClose: () => void;
  title: string;
  hint: string;
  warning?: string;
  onSubmit: (code: string) => Promise<void>;
}

// Four-digit code entry; the real input sits over the tiles so typing, paste and autofill all work
export function CodeSheet({ open, onClose, title, hint, warning, onSubmit }: CodeSheetProps) {
  const id = useId();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCode('');
      setError(null);
    }
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(code);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setCode('');
    } finally {
      setBusy(false);
    }
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
      </form>
    </Sheet>
  );
}
