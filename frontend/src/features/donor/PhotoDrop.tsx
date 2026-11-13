import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { AlertCircle, Camera, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import s from './PostFood.module.css';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 5 * 1024 * 1024;

export default function PhotoDrop({ url, onChange, onUploading }: { url: string; onChange: (url: string) => void; onUploading: (busy: boolean) => void }) {
  const id = useId();
  const [local, setLocal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (local) URL.revokeObjectURL(local);
  }, [local]);

  async function take(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!TYPES.includes(file.type)) return setError('Use a JPG, PNG or WEBP image.');
    if (file.size > MAX) return setError(`That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`);
    setLocal(URL.createObjectURL(file));
    setBusy(true);
    onUploading(true);
    try {
      const res = await api.upload(file);
      onChange(res.url);
    } catch (e) {
      setLocal(null);
      onChange('');
      setError((e as Error).message || 'Upload failed. Try again.');
    } finally {
      setBusy(false);
      onUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files[0]);
  }

  function remove() {
    setLocal(null);
    onChange('');
    setError(null);
  }

  const src = local ?? url;
  return (
    <div className={s.photo}>
      {src ? (
        <div className={s.thumbRow}>
          <span className={s.thumb} data-busy={busy || undefined}>
            <img src={src} alt="Food photo preview" />
            {busy && <span className={s.thumbSpin} aria-hidden />}
          </span>
          <span className={s.thumbText}>
            <strong>{busy ? 'Uploading photo' : 'Photo added'}</strong>
            <span>{busy ? 'This takes a moment on mobile data.' : 'Volunteers see this on the pickup card.'}</span>
          </span>
          <button type="button" className={s.textBtn} onClick={remove} disabled={busy}>
            <Trash2 size={16} strokeWidth={1.75} aria-hidden />
            Remove
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={s.drop}
          data-over={over || undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <Camera size={20} strokeWidth={1.75} aria-hidden />
          <span>
            <strong>Add a photo</strong> <span className={s.dropSoft}>drag here or</span> <u>browse</u>
            <span className={s.dropHint}>JPG, PNG or WEBP up to 5 MB</span>
          </span>
        </label>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept={TYPES.join(',')}
        className="sr-only"
        onChange={(e) => take(e.target.files?.[0])}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      {error && (
        <span id={`${id}-err`} className={s.inlineError} role="alert">
          <AlertCircle size={14} aria-hidden /> {error}
        </span>
      )}
    </div>
  );
}
