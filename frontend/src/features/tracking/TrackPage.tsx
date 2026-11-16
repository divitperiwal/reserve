import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Check, Phone } from 'lucide-react';
import { Avatar, Button, RiskBadge, Skeleton, useToast } from '../../components/ui';
import { api, shownError } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { qty } from '../../lib/format';
import { useT, type T } from '../../lib/i18n';
import type { Donation } from '../../lib/types';
import { CodeSheet } from './codes';
import { FlowSteps, flowStep } from './FlowSteps';
import { isActive, leg, riderAt } from './geo';
import { MapStage } from './MapStage';
import { RouteMap } from './RouteMap';
import { useLegRoute, useTracking } from './useTracking';
import s from './stage.module.css';

const first = (name?: string) => name?.split(/\s+/)[0];

function headline(d: Donation, t: T) {
  const who = first(d.volunteer?.name) ?? t('The volunteer');
  switch (d.status) {
    case 'AVAILABLE':
      return t('Waiting for a kitchen');
    case 'ACCEPTED':
      return t('Waiting for a volunteer');
    case 'CLAIMED':
      return t('{who} is heading to {name}', { who, name: d.donor.name });
    case 'PICKED_UP':
      return t('{who} is bringing it to {name}', { who, name: d.ngo?.name ?? t('the kitchen') });
    case 'DELIVERED':
      return t('Delivered');
    case 'EXPIRED':
      return t('This donation expired');
    default:
      return t('This donation was cancelled');
  }
}

export default function TrackPage() {
  const id = Number(useParams().id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();
  const [codeOpen, setCodeOpen] = useState(false);
  const { donation: d, trail, error, update, retry } = useTracking(id);
  const route = useLegRoute(d, trail);

  if (!user) return null;
  if (user.role === 'VOLUNTEER') return <Navigate to={`/volunteer/pickup/${id}`} replace />;
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(homeFor(user.role)));

  if (error)
    return (
      <div className={s.center}>
        <div className={s.done}>
          <h1 className={s.title}>{t('Couldn’t load this pickup')}</h1>
          <p className={s.sub}>{shownError(error, t)}</p>
          <div className={s.pair}>
            <Button onClick={retry}>{t('Try again')}</Button>
            <Button variant="secondary" onClick={back}>
              {t('Go back')}
            </Button>
          </div>
        </div>
      </div>
    );

  if (!d)
    return (
      <MapStage map={null} onBack={back} backLabel={t('Back')}>
        <div className={s.skeleton} aria-busy="true">
          <Skeleton w="70%" h={28} />
          <Skeleton w="40%" h={48} />
          <Skeleton h={44} r={22} />
        </div>
      </MapStage>
    );

  const isDonor = user.role === 'DONOR';
  const moving = isActive(d.status);
  const eta = moving ? leg(d, trail, null, route) : null;
  const canConfirm = isDonor ? d.status === 'CLAIMED' : d.status === 'PICKED_UP';

  const confirm = async (code: string) => {
    const next = isDonor ? await api.confirmPickup(d.id, code) : await api.confirmDelivery(d.id, code);
    update(next);
    toast(isDonor ? t('Pickup confirmed') : t('Delivery confirmed. Thank you.'));
  };

  return (
    <MapStage map={<RouteMap d={d} trail={trail} route={route} />} onBack={back} backLabel={t('Back')}>
      {d.status === 'DELIVERED' ? (
        <div className={s.done}>
          <span className={s.doneIcon}>
            <Check size={28} strokeWidth={2.5} aria-hidden />
          </span>
          <div className={s.head}>
            <h1 className={s.title}>{t('Delivered')}</h1>
            <p className={s.sub}>
              {t('{title}, {qty}, reached {ngo}. That’s about {meals} meals.', { title: d.title, qty: qty(d, t), ngo: d.ngo?.name ?? t('the kitchen'), meals: d.meals })}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={s.head}>
            <h1 className={s.title}>{headline(d, t)}</h1>
            <p className={s.sub}>
              {t('{title}, {qty}', { title: d.title, qty: qty(d, t) })}
            </p>
          </div>

          {eta && (
            <div className={s.eta}>
              <span className={s.etaNum}>{eta.min}</span>
              <span className={s.etaUnit}>{t('min')}</span>
              <span className={s.etaMeta}>
                {t('{km} km to {name}', { km: eta.km.toFixed(1), name: eta.stop.name })}
              </span>
            </div>
          )}

          {(moving || d.status === 'ACCEPTED') && (
            <RiskBadge
              d={d}
              from={riderAt(d, trail)}
              toDonorMin={d.status === 'CLAIMED' ? eta?.min : undefined}
              toKitchenMin={d.status === 'PICKED_UP' ? eta?.min : undefined}
            />
          )}

          {(moving || d.status === 'AVAILABLE' || d.status === 'ACCEPTED') && <FlowSteps step={flowStep(d)} />}

          {d.volunteer && moving && (
            <div className={s.person}>
              <Avatar initials={d.volunteer.initials} size={44} tone="basil" />
              <span className={s.personText}>
                <span className={s.personName}>{d.volunteer.name}</span>
                <span className={s.personMeta}>{d.volunteer.vehicle ? t(d.volunteer.vehicle) : t('Volunteer')}</span>
              </span>
              <a className={s.call} href={`tel:+91${d.volunteer.phone}`} aria-label={t('Call {name}', { name: d.volunteer.name })}>
                <Phone size={18} strokeWidth={2} aria-hidden />
              </a>
            </div>
          )}

          {canConfirm && (
            <div className={s.actions}>
              <Button size="lg" block onClick={() => setCodeOpen(true)}>
                {isDonor ? t('Confirm pickup') : t('Confirm delivery')}
              </Button>
              <p className={s.note}>{t('Ask {name} for the 4-digit code.', { name: first(d.volunteer?.name) ?? t('the volunteer') })}</p>
            </div>
          )}
        </>
      )}

      <CodeSheet
        open={codeOpen}
        donationId={d.id}
        onClose={() => setCodeOpen(false)}
        title={isDonor ? t('Confirm pickup') : t('Confirm delivery')}
        hint={t('Enter the code {name} shows you.', { name: first(d.volunteer?.name) ?? t('the volunteer') })}
        onSubmit={confirm}
      />
    </MapStage>
  );
}
