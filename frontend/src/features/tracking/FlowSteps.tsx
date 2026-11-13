import { Check } from 'lucide-react';
import { cx } from '../../components/ui';
import type { Donation } from '../../lib/types';
import s from './flowSteps.module.css';

const LABELS = ['Posted', 'Kitchen accepted', 'Volunteer on the way', 'Picked up', 'Delivered'];

export const flowStep = (d: Donation): number => ({ AVAILABLE: 0, ACCEPTED: 1, CLAIMED: 2, PICKED_UP: 3, DELIVERED: 4 })[d.status as string] ?? 0;

// Posted, kitchen accepted, volunteer on the way, picked up, delivered
export function FlowSteps({ step }: { step: number }) {
  return (
    <ol className={s.steps} aria-label={`Status: ${LABELS[Math.min(step, 4)]}`}>
      {LABELS.map((label, i) => {
        const done = step > i || step === 4;
        const now = step === i && step !== 4;
        return (
          <li key={label} className={cx(s.step, done && s.done)}>
            <span className={cx(s.dot, done && s.dotDone, now && s.dotNow)}>{done && <Check size={12} strokeWidth={3} aria-hidden />}</span>
            <span className={s.label}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
