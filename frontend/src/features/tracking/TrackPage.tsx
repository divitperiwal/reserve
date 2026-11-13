import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Check, Phone } from 'lucide-react';
import { Avatar, Button, Skeleton, useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { qty } from '../../lib/format';
import type { Donation } from '../../lib/types';
import { CodeSheet } from './codes';
import { FlowSteps, flowStep } from './FlowSteps';
import { isActive, leg } from './geo';
import { MapStage } from './MapStage';
import { RouteMap } from './RouteMap';
import { useTracking } from './useTracking';
import s from './stage.module.css';

const first = (name?: string) => name?.split(/\s+/)[0] ?? 'The volunteer';

function headline(d: Donation) {
  const who = first(d.volunteer?.name);
  switch (d.status) {
    case 'AVAILABLE':
      return 'Waiting for a kitchen';
    case 'ACCEPTED':
      return 'Waiting for a volunteer';
    case 'CLAIMED':
      return `${who} is heading to ${d.donor.name}`;
    case 'PICKED_UP':
      return `${who} is bringing it to ${d.ngo?.name ?? 'the kitchen'}`;
    case 'DELIVERED':
      return 'Delivered';
    case 'EXPIRED':
      return 'This donation expired';
    default:
      return 'This donation was cancelled';
  }
}

export default function TrackPage() {
  const id = Number(useParams().id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [codeOpen, setCodeOpen] = useState(false);
  const { donation: d, trail, error, update, retry } = useTracking(id);

  if (!user) return null;
  if (user.role === 'VOLUNTEER') return <Navigate to={`/volunteer/pickup/${id}`} replace />;
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(homeFor(user.role)));

  if (error)
    return (
      <div className={s.center}>
        <div className={s.done}>
          <h1 className={s.title}>Couldn’t load this pickup</h1>
          <p className={s.sub}>{error}</p>
          <div className={s.pair}>
            <Button onClick={retry}>Try again</Button>
            <Button variant="secondary" onClick={back}>
              Go back
            </Button>
          </div>
        </div>
      </div>
    );

  if (!d)
    return (
      <MapStage map={null} onBack={back} backLabel="Back">
        <div className={s.skeleton} aria-busy="true">
          <Skeleton w="70%" h={28} />
          <Skeleton w="40%" h={48} />
          <Skeleton h={44} r={22} />
        </div>
      </MapStage>
    );

  const isDonor = user.role === 'DONOR';
  const moving = isActive(d.status);
  const eta = moving ? leg(d, trail) : null;
  const canConfirm = isDonor ? d.status === 'CLAIMED' : d.status === 'PICKED_UP';

  const confirm = async (code: string) => {
    const next = isDonor ? await api.confirmPickup(d.id, code) : await api.confirmDelivery(d.id, code);
    update(next);
    toast(isDonor ? 'Pickup confirmed' : 'Delivery confirmed. Thank you.');
  };

  return (
    <MapStage map={<RouteMap d={d} trail={trail} />} onBack={back} backLabel="Back">
      {d.status === 'DELIVERED' ? (
        <div className={s.done}>
          <span className={s.doneIcon}>
            <Check size={28} strokeWidth={2.5} aria-hidden />
          </span>
          <div className={s.head}>
            <h1 className={s.title}>Delivered</h1>
            <p className={s.sub}>
              {d.title}, {qty(d)}, reached {d.ngo?.name ?? 'the kitchen'}. That’s about {d.meals} meals.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={s.head}>
            <h1 className={s.title}>{headline(d)}</h1>
            <p className={s.sub}>
              {d.title}, {qty(d)}
            </p>
          </div>

          {eta && (
            <div className={s.eta}>
              <span className={s.etaNum}>{eta.min}</span>
              <span className={s.etaUnit}>min</span>
              <span className={s.etaMeta}>
                {eta.km.toFixed(1)} km to {eta.stop.name}
              </span>
            </div>
          )}

          {(moving || d.status === 'AVAILABLE' || d.status === 'ACCEPTED') && <FlowSteps step={flowStep(d)} />}

          {d.volunteer && moving && (
            <div className={s.person}>
              <Avatar initials={d.volunteer.initials} size={44} tone="basil" />
              <span className={s.personText}>
                <span className={s.personName}>{d.volunteer.name}</span>
                <span className={s.personMeta}>{d.volunteer.vehicle ?? 'Volunteer'}</span>
              </span>
              <a className={s.call} href={`tel:+91${d.volunteer.phone}`} aria-label={`Call ${d.volunteer.name}`}>
                <Phone size={18} strokeWidth={2} aria-hidden />
              </a>
            </div>
          )}

          {canConfirm && (
            <div className={s.actions}>
              <Button size="lg" block onClick={() => setCodeOpen(true)}>
                {isDonor ? 'Confirm pickup' : 'Confirm delivery'}
              </Button>
              <p className={s.note}>Ask {first(d.volunteer?.name)} for the 4-digit code.</p>
            </div>
          )}
        </>
      )}

      <CodeSheet
        open={codeOpen}
        onClose={() => setCodeOpen(false)}
        title={isDonor ? 'Confirm pickup' : 'Confirm delivery'}
        hint={`Enter the code ${first(d.volunteer?.name)} shows you.`}
        onSubmit={confirm}
      />
    </MapStage>
  );
}
