import { Button, Countdown, DietMark, Group, Row, Sheet } from '../../components/ui';
import { categoryLabel, km, qty } from '../../lib/format';
import type { Donation } from '../../lib/types';
import { clockTime } from '../donor/donorKit';
import { foodImage } from '../../lib/food';
import s from './volunteer.module.css';

interface PickupSheetProps {
  d: Donation | null;
  onClose: () => void;
  onClaim: (d: Donation) => void;
  busy: boolean;
  blocked: boolean;
}

// Everything a volunteer needs to decide, with one action
export function PickupSheet({ d, onClose, onClaim, busy, blocked }: PickupSheetProps) {
  return (
    <Sheet
      open={!!d}
      onClose={onClose}
      title={d?.title}
      footer={
        d && (
          <div className={s.sheetAction}>
            <Button size="lg" block loading={busy} disabled={blocked} onClick={() => onClaim(d)}>
              Claim pickup
            </Button>
            {blocked && <p className={s.sheetNote}>Finish your current pickup first.</p>}
          </div>
        )
      }
    >
      {d && (
        <div className={s.detail}>
          <img className={s.photo} src={foodImage(d)} alt="" />
          <div className={s.bigTime}>
            <Countdown to={d.bestBefore} format="short" className={s.bigCountdown} />
            <span>best before {clockTime(d.bestBefore)}</span>
          </div>
          <Group>
            <Row title="Amount" trailing={<span className={s.value}>{qty(d)}</span>} />
            <Row
              title="Type"
              trailing={
                <span className={s.value}>
                  <DietMark diet={d.diet} /> {categoryLabel[d.category]}
                </span>
              }
            />
            <Row title="Pickup window" trailing={<span className={s.value}>{`${clockTime(d.pickupFrom)} to ${clockTime(d.pickupUntil)}`}</span>} />
          </Group>
          <Group>
            <Row title={d.donor.name} subtitle={`${d.address}${d.distanceKm !== undefined ? `, ${km(d.distanceKm)} away` : ''}`} />
          </Group>
          {d.note && <p className={s.note}>“{d.note}”</p>}
        </div>
      )}
    </Sheet>
  );
}
