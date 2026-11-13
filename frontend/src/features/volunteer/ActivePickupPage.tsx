import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Navigation, Phone } from 'lucide-react';
import { Button, ButtonLink, Group, Row, Skeleton, Stepper, Toggle, useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { qty } from '../../lib/format';
import type { Donation } from '../../lib/types';
import { CodeTiles } from '../tracking/codes';
import { isActive, leg, nextStop } from '../tracking/geo';
import { MapStage } from '../tracking/MapStage';
import { RouteMap } from '../tracking/RouteMap';
import { useTracking } from '../tracking/useTracking';
import st from '../tracking/stage.module.css';
import { useVolunteer } from './context';
import { useLocationShare } from './hooks';
import s from './volunteer.module.css';

const directions = (to: { lat: number; lng: number }) => `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=two-wheeler`;

const gpsText = { pending: 'Finding your location', ok: 'Sharing live location', far: 'You look far from this pickup', denied: 'Location is blocked', unavailable: 'Location isn’t available' };

export default function ActivePickupPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const toast = useToast();
  const { setActive, setSkipped } = useVolunteer();
  const [releasing, setReleasing] = useState(false);

  const { donation: d, trail, error, update, pushPoint, retry } = useTracking(id, (next, _prev, full) => {
    if (next === 'PICKED_UP') toast(`Picked up. Now head to ${full.ngo?.name ?? 'the kitchen'}.`);
    if (next === 'DELIVERED') {
      toast('Delivered. Thank you!');
      setActive(null);
    }
    if (isActive(next)) setActive(full);
  });
  const share = useLocationShare(d, pushPoint);
  const back = () => navigate('/volunteer');

  if (error)
    return (
      <div className={st.center}>
        <div className={st.done}>
          <h1 className={st.title}>Couldn’t load this pickup</h1>
          <p className={st.sub}>{error}</p>
          <div className={st.pair}>
            <Button onClick={retry}>Try again</Button>
            <Button variant="secondary" onClick={back}>
              Back to pickups
            </Button>
          </div>
        </div>
      </div>
    );

  if (!d)
    return (
      <MapStage map={null} onBack={back} backLabel="Pickups">
        <div className={st.skeleton} aria-busy="true">
          <Skeleton w="70%" h={28} />
          <Skeleton w="40%" h={48} />
          <Skeleton h={52} r={26} />
        </div>
      </MapStage>
    );

  const release = async () => {
    setReleasing(true);
    try {
      update(await api.release(d.id));
      setActive(null);
      setSkipped((l) => [...l, d.id]);
      toast('Released. Another volunteer will be found.');
      navigate('/volunteer', { replace: true });
    } catch (e) {
      toast((e as Error).message, { error: true });
      setReleasing(false);
    }
  };

  if (!isActive(d.status)) return <Finished d={d} onBack={back} />;

  const toDonor = d.status === 'CLAIMED';
  const stop = nextStop(d)!;
  const eta = leg(d, trail);
  const code = toDonor ? d.pickupCode : d.dropCode;
  const contact = toDonor ? d.donor.phone : undefined;

  return (
    <MapStage map={<RouteMap d={d} trail={trail} />} onBack={back} backLabel="Pickups">
      <div className={st.head}>
        <h1 className={st.title}>{toDonor ? `Head to ${d.donor.name}` : `Deliver to ${stop.name}`}</h1>
        <p className={st.sub}>
          {d.title}, {qty(d)}
        </p>
      </div>

      {eta && (
        <div className={st.eta}>
          <span className={st.etaNum}>{eta.min}</span>
          <span className={st.etaUnit}>min</span>
          <span className={st.etaMeta}>{eta.km.toFixed(1)} km away</span>
        </div>
      )}

      <Stepper step={toDonor ? 0 : 1} />

      {code && (
        <div className={st.codeBlock}>
          <span className={st.codeLabel}>
            <strong>{toDonor ? 'Pickup code' : 'Delivery code'}</strong>
            <span>{toDonor ? `Show this to ${d.donor.name} when you collect.` : `Show this to ${stop.name} when you hand over.`}</span>
          </span>
          <CodeTiles code={code} label={toDonor ? 'Pickup code' : 'Delivery code'} />
        </div>
      )}

      <div className={st.actions}>
        <div className={s.actionRow}>
          <ButtonLink
            to={directions(stop)}
            target="_blank"
            rel="noreferrer"
            size="lg"
            className={s.grow}
            icon={<Navigation size={18} strokeWidth={2} aria-hidden />}
          >
            Navigate
          </ButtonLink>
          {contact && (
            <a className={st.call} href={`tel:+91${contact}`} aria-label={`Call ${d.donor.name}`}>
              <Phone size={18} strokeWidth={2} aria-hidden />
            </a>
          )}
        </div>
        {toDonor && (
          <Button variant="ghost" block loading={releasing} onClick={release}>
            Release pickup
          </Button>
        )}
      </div>

      <Group footer={share.canSimulate ? 'No GPS nearby? Simulate the ride to see live tracking.' : undefined}>
        <Row
          title={share.simulating ? 'Simulating ride' : gpsText[share.gps]}
          subtitle={share.sharing ? 'The donor and kitchen see you on the map' : undefined}
          leading={<span className={s.liveDot} data-on={share.sharing || undefined} aria-hidden />}
          chevron={false}
        />
        {share.canSimulate && (
          <Row title="Simulate ride" trailing={<Toggle label="Simulate ride" checked={share.simulating} onChange={share.setSimulating} />} chevron={false} />
        )}
      </Group>
    </MapStage>
  );
}

function Finished({ d, onBack }: { d: Donation; onBack: () => void }) {
  const delivered = d.status === 'DELIVERED';
  return (
    <div className={st.center}>
      <div className={st.done}>
        {delivered && (
          <span className={st.doneIcon}>
            <Check size={28} strokeWidth={2.5} aria-hidden />
          </span>
        )}
        <div className={st.head}>
          <h1 className={st.title}>{delivered ? 'Delivered' : 'This pickup is closed'}</h1>
          <p className={st.sub}>
            {delivered ? `${d.title} reached ${d.ngo?.name ?? 'the kitchen'}. That’s about ${d.meals} meals.` : 'It’s no longer assigned to you.'}
          </p>
        </div>
        <Button size="lg" onClick={onBack}>
          Back to pickups
        </Button>
      </div>
    </div>
  );
}
