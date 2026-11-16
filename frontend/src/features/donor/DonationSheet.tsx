import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { Avatar, Button, ButtonLink, Group, Row, Sheet, useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { qty } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { useNow } from '../../lib/time';
import type { Donation } from '../../lib/types';
import { CodeSheet } from '../tracking/codes';
import { FlowSteps, flowStep } from '../tracking/FlowSteps';
import { useDonorData } from './DonorData';
import { toRepost } from './usePostForm';
import { clockTime, dayTime, firstName, pickupWindow, statusText } from './donorKit';
import s from './pages.module.css';

const nearby = new Map<number, Promise<number | null>>();

// One lookup per donation; a failed lookup just hides the line
const nearbyCount = (id: number) => {
  if (!nearby.has(id))
    nearby.set(
      id,
      api.nearbyVolunteers(id).then(
        (r) => r.count,
        () => {
          nearby.delete(id);
          return null;
        },
      ),
    );
  return nearby.get(id)!;
};

export function PickupCloses({ to, className }: { to: string; className?: string }) {
  const t = useT();
  const left = new Date(to).getTime() - useNow();
  const m = Math.max(0, Math.floor(left / 60_000));
  const text =
    left <= 0
      ? t('Pickup window closed')
      : m < 1
        ? t('Pickup closes in less than a minute')
        : t('Pickup closes in {time}', { time: m >= 60 ? t('{h}h {m}m', { h: Math.floor(m / 60), m: m % 60 }) : t('{m}m', { m }) });
  return <span className={className}>{text}</span>;
}

// Kitchen visibility and its stale nudge before a kitchen accepts, nearby volunteer count after
export function WaitingNote({ d, className }: { d: Donation; className?: string }) {
  const t = useT();
  const now = useNow();
  const [count, setCount] = useState<number | null>(null);
  const accepted = d.status === 'ACCEPTED';
  useEffect(() => {
    if (!accepted) return;
    let live = true;
    nearbyCount(d.id).then((c) => live && setCount(c));
    return () => {
      live = false;
    };
  }, [d.id, accepted]);
  if (accepted) return count != null && count > 0 ? <span className={className}>{count === 1 ? t('1 volunteer nearby notified') : t('{n} volunteers nearby notified', { n: count })}</span> : null;
  if (now >= new Date(d.pickupUntil).getTime()) return null;
  const stale = now - new Date(d.createdAt).getTime() >= 20 * 60_000;
  return <span className={className}>{t(stale ? 'No kitchen has taken this yet. A longer pickup window helps.' : 'Kitchens nearby can see this.')}</span>;
}

// Detail for one donation, with the single action that fits its status
export function DonationSheet({ d, onClose }: { d: Donation | null; onClose: () => void }) {
  const { upsert } = useDonorData();
  const toast = useToast();
  const t = useT();
  const [codeOpen, setCodeOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [released, setReleased] = useState(false);
  const navigate = useNavigate();
  const id = d?.id;
  const waiting = d?.status === 'AVAILABLE' || d?.status === 'ACCEPTED';
  const accepted = d?.status === 'ACCEPTED';

  useEffect(() => {
    setReleased(false);
    if (!id || !accepted) return;
    let live = true;
    api.activity(100).then((list) => live && setReleased(list.find((a) => a.donationId === id)?.type === 'RELEASED'), () => {});
    return () => {
      live = false;
    };
  }, [id, accepted]);

  if (!d) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const moving = d.status === 'CLAIMED' || d.status === 'PICKED_UP';

  const cancel = async () => {
    setCancelling(true);
    try {
      await api.cancelDonation(d.id);
      upsert({ ...d, status: 'CANCELLED' });
      toast(t('Donation cancelled'));
      onClose();
    } catch (e) {
      toast((e as Error).message, { error: true });
    } finally {
      setCancelling(false);
    }
  };

  const confirm = async (code: string) => {
    upsert(await api.confirmPickup(d.id, code));
    toast(t('Pickup confirmed'));
  };

  const footer =
    d.status === 'AVAILABLE' ? (
      <Button variant="danger" size="lg" block loading={cancelling} onClick={cancel}>
        {t('Cancel donation')}
      </Button>
    ) : d.status === 'ACCEPTED' ? (
      <div className={s.footerPair}>
        <ButtonLink to={`/track/${d.id}`} variant="secondary" size="lg">
          {t('Track')}
        </ButtonLink>
        <Button variant="danger" size="lg" className={s.grow} loading={cancelling} onClick={cancel}>
          {t('Cancel donation')}
        </Button>
      </div>
    ) : d.status === 'CLAIMED' ? (
      <div className={s.footerPair}>
        <ButtonLink to={`/track/${d.id}`} variant="secondary" size="lg">
          {t('Track')}
        </ButtonLink>
        <Button size="lg" className={s.grow} onClick={() => setCodeOpen(true)}>
          {t('Confirm pickup')}
        </Button>
      </div>
    ) : d.status === 'PICKED_UP' ? (
      <ButtonLink to={`/track/${d.id}`} size="lg" block>
        {t('Track delivery')}
      </ButtonLink>
    ) : d.status === 'EXPIRED' ? (
      <Button size="lg" block onClick={() => navigate('/donor/new', { state: { repost: toRepost(d) } })}>
        {t('Post again')}
      </Button>
    ) : undefined;

  return (
    <>
      <Sheet open={!codeOpen} onClose={onClose} title={d.title} footer={footer}>
        <div className={s.detail}>
          <div className={s.status}>
            <strong>{statusText(d, t)}</strong>
            {released && <span>{t('The volunteer couldn’t make it. We are finding another.')}</span>}
            {waiting && <PickupCloses to={d.pickupUntil} />}
            {waiting && <WaitingNote d={d} />}
          </div>

          {(waiting || moving) && <FlowSteps step={flowStep(d)} />}

          {d.volunteer && moving && (
            <Group>
              <Row
                leading={<Avatar initials={d.volunteer.initials} size={40} tone="basil" />}
                title={d.volunteer.name}
                subtitle={t(d.volunteer.vehicle ?? 'Volunteer')}
                trailing={
                  <a className={s.call} href={`tel:+91${d.volunteer.phone}`} aria-label={t('Call {name}', { name: firstName(d.volunteer.name, t) })}>
                    <Phone size={16} strokeWidth={2} aria-hidden />
                  </a>
                }
                chevron={false}
              />
            </Group>
          )}

          <Group>
            <Row title={t('Amount')} trailing={qty(d)} />
            {d.ngo && <Row title={t('Kitchen')} trailing={d.ngo.name} />}
            <Row title={t('Best before')} trailing={clockTime(d.bestBefore)} />
            <Row title={t('Pickup window')} trailing={pickupWindow(d.pickupFrom, d.pickupUntil, t)} />
            <Row title={t('Posted')} trailing={dayTime(d.createdAt, t)} />
          </Group>
        </div>
      </Sheet>
      <CodeSheet
        open={codeOpen}
        donationId={d.id}
        onClose={() => setCodeOpen(false)}
        title={t('Confirm pickup')}
        hint={t('Enter the 4-digit code {name} shows you.', { name: firstName(d.volunteer?.name, t) })}
        onSubmit={confirm}
      />
    </>
  );
}
