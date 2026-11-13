import { Badge } from '../../components/ui';
import { FoodThumb } from '../../components/dash';
import { num, qty, statusLabel } from '../../lib/format';
import type { Donation, Status } from '../../lib/types';
import { dayWord, statusText } from './donorKit';
import s from './donationTable.module.css';

const tone: Partial<Record<Status, 'fresh' | 'critical' | 'neutral' | 'dark'>> = {
  DELIVERED: 'fresh',
  EXPIRED: 'critical',
  CANCELLED: 'neutral',
  AVAILABLE: 'dark',
  ACCEPTED: 'dark',
  CLAIMED: 'dark',
  PICKED_UP: 'dark',
};

// Donation rows as a table on tablets and up, compact rows on phones
export function DonationTable({ items, onOpen, empty, label }: { items: Donation[]; onOpen: (id: number) => void; empty: string; label: string }) {
  if (!items.length) return <p className={s.quiet}>{empty}</p>;
  return (
    <div className={s.table} role="table" aria-label={label}>
      <div className={s.thead} role="row">
        <span role="columnheader">Food</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Amount</span>
        <span role="columnheader">Meals</span>
        <span role="columnheader">Date</span>
      </div>
      {items.map((d) => (
        <button key={d.id} type="button" className={s.tr} role="row" onClick={() => onOpen(d.id)}>
          <span className={s.food} role="cell">
            <FoodThumb d={d} size={40} />
            <span>
              <strong>{d.title}</strong>
              <em>{d.ngo ? `To ${d.ngo.name}` : statusText(d)}</em>
            </span>
          </span>
          <span role="cell">
            <Badge tone={tone[d.status]}>{statusLabel[d.status]}</Badge>
          </span>
          <span role="cell" className={s.cellMuted}>
            {qty(d)}
          </span>
          <span role="cell" className={s.num}>
            {d.status === 'EXPIRED' || d.status === 'CANCELLED' ? '–' : num(d.meals)}
          </span>
          <span role="cell" className={s.cellMuted}>
            {dayWord(d.deliveredAt ?? d.createdAt)}
          </span>
        </button>
      ))}
    </div>
  );
}
