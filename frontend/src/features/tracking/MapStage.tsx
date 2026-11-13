import { useState, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cx } from '../../components/ui';
import s from './stage.module.css';

interface MapStageProps {
  map: ReactNode;
  onBack: () => void;
  backLabel: string;
  children: ReactNode;
  more?: ReactNode;
  busy?: boolean;
}

// Full-screen map with one floating card: top-left on desktop, an expandable bottom sheet on phones
export function MapStage({ map, onBack, backLabel, children, more, busy }: MapStageProps) {
  const [open, setOpen] = useState(false);
  return (
    <main className={s.stage}>
      <div className={s.map}>{map}</div>
      <button type="button" className={s.floatBack} onClick={onBack} aria-label={backLabel}>
        <ChevronLeft size={22} strokeWidth={1.75} aria-hidden />
      </button>
      <section className={s.card} aria-busy={busy || undefined} aria-label="Pickup status">
        {more ? (
          <button type="button" className={s.grabber} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Show less' : 'Show more'}>
            <span aria-hidden />
          </button>
        ) : (
          <span className={s.grabberStatic} aria-hidden />
        )}
        <button type="button" className={s.cardBack} onClick={onBack}>
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
          {backLabel}
        </button>
        <div className={s.body}>{children}</div>
        {more && (
          <div className={cx(s.body, s.more)} data-open={open}>
            {more}
          </div>
        )}
      </section>
    </main>
  );
}
