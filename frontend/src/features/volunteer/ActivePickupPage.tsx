import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Navigation, Phone } from 'lucide-react';
import { Button, ButtonLink, Group, Row, Skeleton, Stepper, Toggle, useToast } from '../../components/ui';
import { api, shownError } from '../../lib/api';
import { qty } from '../../lib/format';
import { useT } from '../../lib/i18n';
import type { Donation } from '../../lib/types';
import { CodeQr, CodeTiles } from '../tracking/codes';
import { isActive, leg, nextStop } from '../tracking/geo';
import { MapStage } from '../tracking/MapStage';
import { RouteMap } from '../tracking/RouteMap';
import { useLegRoute, useTracking } from '../tracking/useTracking';
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
  const t = useT();
  const { setActive, setSkipped } = useVolunteer();
  const [releasing, setReleasing] = useState(false);

  const { donation: d, trail, error, update, pushPoint, retry } = useTracking(id, (next, _prev, full) => {
    if (next === 'PICKED_UP') toast(full.ngo ? t('Picked up. Now head to {ngo}.', { ngo: full.ngo.name }) : t('Picked up. Now head to the kitchen.'));
    if (next === 'DELIVERED') {
      toast(t('Delivered. Thank you!'));
      setActive(null);
    }
    if (isActive(next)) setActive(full);
  });
  const route = useLegRoute(d, trail);
  const share = useLocationShare(d, pushPoint);
  const back = () => navigate('/volunteer');

  if (error)
    return (
      <div className={st.center}>
        <div className={st.done}>
          <h1 className={st.title}>{t('Couldn’t load this pickup')}</h1>
          <p className={st.sub}>{shownError(error, t)}</p>
          <div className={st.pair}>
            <Button onClick={retry}>{t('Try again')}</Button>
            <Button variant="secondary" onClick={back}>
              {t('Back to pickups')}
            </Button>
          </div>
        </div>
      </div>
    );

  if (!d)
    return (
      <MapStage map={null} onBack={back} backLabel={t('Pickups')}>
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
      toast(t('Released. Another volunteer will be found.'));
      navigate('/volunteer', { replace: true });
    } catch (e) {
      toast((e as Error).message, { error: true });
      setReleasing(false);
    }
  };

  if (!isActive(d.status)) return <Finished d={d} onBack={back} />;

  const toDonor = d.status === 'CLAIMED';
  const stop = nextStop(d)!;
  const eta = leg(d, trail, null, route);
  const code = toDonor ? d.pickupCode : d.dropCode;
  const contact = toDonor ? d.donor.phone : undefined;

  return (
    <MapStage map={<RouteMap d={d} trail={trail} route={route} />} onBack={back} backLabel={t('Pickups')}>
      <div className={st.head}>
        <h1 className={st.title}>{toDonor ? t('Head to {name}', { name: d.donor.name }) : t('Deliver to {name}', { name: stop.name })}</h1>
        <p className={st.sub}>
          {d.title}, {qty(d, t)}
        </p>
      </div>

      {eta && (
        <div className={st.eta}>
          <span className={st.etaNum}>{eta.min}</span>
          <span className={st.etaUnit}>{t('min')}</span>
          <span className={st.etaMeta}>{t('{km} km away', { km: eta.km.toFixed(1) })}</span>
        </div>
      )}

      <Stepper step={toDonor ? 0 : 1} />

      {code && (
        <div className={st.codeBlock}>
          <span className={st.codeLabel}>
            <strong>{toDonor ? t('Pickup code') : t('Delivery code')}</strong>
            <span>{toDonor ? t('Show this to {name} when you collect.', { name: d.donor.name }) : t('Show this to {name} when you hand over.', { name: stop.name })}</span>
          </span>
          <CodeQr donationId={d.id} code={code} label={toDonor ? t('Pickup code') : t('Delivery code')} />
          <CodeTiles code={code} label={toDonor ? t('Pickup code') : t('Delivery code')} />
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
            {t('Navigate')}
          </ButtonLink>
          {contact && (
            <a className={st.call} href={`tel:+91${contact}`} aria-label={t('Call {name}', { name: d.donor.name })}>
              <Phone size={18} strokeWidth={2} aria-hidden />
            </a>
          )}
        </div>
        {toDonor && (
          <Button variant="ghost" block loading={releasing} onClick={release}>
            {t('Release pickup')}
          </Button>
        )}
      </div>

      <Group footer={share.canSimulate ? t('No GPS nearby? Simulate the ride to see live tracking.') : undefined}>
        <Row
          title={share.simulating ? t('Simulating ride') : t(gpsText[share.gps])}
          subtitle={share.sharing ? t('The donor and kitchen see you on the map') : undefined}
          leading={<span className={s.liveDot} data-on={share.sharing || undefined} aria-hidden />}
          chevron={false}
        />
        {share.canSimulate && (
          <Row title={t('Simulate ride')} trailing={<Toggle label={t('Simulate ride')} checked={share.simulating} onChange={share.setSimulating} />} chevron={false} />
        )}
      </Group>
    </MapStage>
  );
}

function Finished({ d, onBack }: { d: Donation; onBack: () => void }) {
  const delivered = d.status === 'DELIVERED';
  const t = useT();
  return (
    <div className={st.center}>
      <div className={st.done}>
        {delivered && (
          <span className={st.doneIcon}>
            <Check size={28} strokeWidth={2.5} aria-hidden />
          </span>
        )}
        <div className={st.head}>
          <h1 className={st.title}>{delivered ? t('Delivered') : t('This pickup is closed')}</h1>
          <p className={st.sub}>
            {delivered ? t('{title} reached {ngo}. That’s about {meals} meals.', { title: d.title, ngo: d.ngo?.name ?? t('the kitchen'), meals: d.meals }) : t('It’s no longer assigned to you.')}
          </p>
        </div>
        <Button size="lg" onClick={onBack}>
          {t('Back to pickups')}
        </Button>
      </div>
    </div>
  );
}
