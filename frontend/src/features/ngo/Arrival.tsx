import { Link } from 'react-router-dom';
import { Avatar, Button, ButtonLink } from '../../components/ui';
import { FoodThumb } from '../../components/dash';
import { qty } from '../../lib/format';
import { useT } from '../../lib/i18n';
import type { Donation } from '../../lib/types';
import { lateText, pastBestBefore } from './useDeliveries';
import s from './today.module.css';

// One delivery on its way to this kitchen
export function Arrival({ d, eta, onConfirm }: { d: Donation; eta: number; onConfirm: () => void }) {
  const here = d.status === 'PICKED_UP';
  const t = useT();
  return (
    <article className={s.arrival}>
      <Link to={`/track/${d.id}`} className={s.arrivalMain}>
        <FoodThumb d={d} size={88} />
        <span className={s.arrivalText}>
          <strong>{d.title}</strong>
          <span>
            {t('{qty}, {meals} meals, from {donor}', { qty: qty(d, t), meals: d.meals, donor: d.donor.name })}
          </span>
          <span className={s.rider}>
            <Avatar initials={d.volunteer?.initials ?? '?'} size={22} tone="basil" />
            {d.volunteer?.name ?? t('Volunteer')}, {here ? t('on the way to you') : t('picking up')}
          </span>
        </span>
        <span className={s.eta}>
          <strong>{eta}</strong>
          <span>{t('min')}</span>
        </span>
      </Link>
      {pastBestBefore(d) && <p className={s.late}>{t(lateText)}</p>}
      <div className={s.arrivalFoot}>
        <span className={s.track} aria-hidden>
          <span style={{ width: here ? '72%' : '30%' }} />
        </span>
        {here ? (
          <Button size="sm" onClick={onConfirm}>
            {t('Confirm delivery')}
          </Button>
        ) : (
          <ButtonLink to={`/track/${d.id}`} size="sm" variant="secondary">
            {t('Track')}
          </ButtonLink>
        )}
      </div>
    </article>
  );
}
