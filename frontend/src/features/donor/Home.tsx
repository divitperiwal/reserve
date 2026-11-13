import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Soup } from 'lucide-react';
import { Avatar, Badge, Button, ButtonLink, EmptyState, Skeleton } from '../../components/ui';
import { Columns, Kpi, KpiRow, Page, Panel, SectionHead, Topbar } from '../../components/dash';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { foodImage } from '../../lib/food';
import { haversineKm, km, num, qty, statusLabel, tonnes } from '../../lib/format';
import type { Donation, NgoRef } from '../../lib/types';
import { DonationSheet, PickupCloses, WaitingNote } from './DonationSheet';
import { DonationTable } from './DonationTable';
import { useDonorData } from './DonorData';
import { co2For, greeting, isLive, statusText } from './donorKit';
import s from './home.module.css';

const progressOf: Record<string, number> = { AVAILABLE: 0.12, ACCEPTED: 0.3, CLAIMED: 0.55, PICKED_UP: 0.8 };

export default function Home() {
  const { user } = useAuth();
  const { items, error, reload } = useDonorData();
  const [openId, setOpenId] = useState<number | null>(null);
  const live = items?.filter(isLive) ?? [];
  const delivered = items?.filter((d) => d.status === 'DELIVERED') ?? [];
  const meals = delivered.reduce((a, d) => a + d.meals, 0);
  const kg = delivered.reduce((a, d) => a + d.weightKg, 0);
  const open = items?.find((d) => d.id === openId) ?? null;

  return (
    <Page>
      <Topbar
        title={`${greeting()}, ${user?.name ?? ''}`}
        subtitle={user?.address}
        actions={
          <ButtonLink to="/donor/new" icon={<Plus size={18} strokeWidth={2.25} aria-hidden />}>
            Post food
          </ButtonLink>
        }
      />

      <KpiRow>
        <Kpi label="Live now" value={items ? live.length : '–'} tone={live.length ? 'basil' : undefined} note={live.length ? 'In progress' : 'Nothing waiting'} />
        <Kpi label="Meals shared" value={items ? num(meals) : '–'} note={`${delivered.length} deliveries`} />
        <Kpi label="Food saved" value={items ? tonnes(kg) : '–'} note="Kept out of landfill" />
        <Kpi label="CO₂e avoided" value={items ? tonnes(co2For(kg)) : '–'} note="2.5 kg per kg of food" />
      </KpiRow>

      {!items && error ? (
        <EmptyState icon={Soup} title="Couldn’t load your donations" action={<Button variant="secondary" onClick={reload}>Try again</Button>}>
          {error}
        </EmptyState>
      ) : (
        <Columns
          main={
            <>
              {items && live.length === 0 && <PostBanner />}
              {live.length > 0 && (
                <section className={s.block}>
                  <SectionHead title="Live now" count={live.length} />
                  <div className={s.liveGrid}>
                    {live.map((d) => (
                      <LiveCard key={d.id} d={d} onOpen={() => setOpenId(d.id)} />
                    ))}
                  </div>
                </section>
              )}
              <Panel title="Recent donations" action={<Link to="/donor/donations" className={s.link}>See all</Link>} flush>
                {!items ? (
                  <div className={s.tableSkel}>
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} h={48} r={10} />
                    ))}
                  </div>
                ) : (
                  <DonationTable items={items.filter((d) => !isLive(d)).slice(0, 8)} onOpen={setOpenId} label="Recent donations" empty="Delivered and past donations show up here." />
                )}
              </Panel>
            </>
          }
          side={
            <>
              {live.length > 0 && <PostBanner compact />}
              <Panel title="Last 14 days">{items ? <Spark items={items} /> : <Skeleton h={120} />}</Panel>
              <Kitchens />
            </>
          }
        />
      )}

      <DonationSheet d={open} onClose={() => setOpenId(null)} />
    </Page>
  );
}

function PostBanner({ compact }: { compact?: boolean }) {
  return (
    <section className={compact ? s.bannerCompact : s.banner}>
      <div className={s.bannerText}>
        <h2>Got surplus food?</h2>
        <p>Post it in under a minute. A kitchen nearby takes what it needs, then a volunteer delivers it.</p>
        <ButtonLink to="/donor/new" variant="dark" icon={<Plus size={18} strokeWidth={2.25} aria-hidden />}>
          Post food
        </ButtonLink>
      </div>
      {!compact && (
        <div className={s.bannerArt} aria-hidden>
          <img src="/food/biryani.jpg" alt="" />
          <img src="/food/bread.jpg" alt="" />
          <img src="/food/idli.jpg" alt="" />
        </div>
      )}
    </section>
  );
}

function LiveCard({ d, onOpen }: { d: Donation; onOpen: () => void }) {
  const waiting = d.status === 'AVAILABLE' || d.status === 'ACCEPTED';
  return (
    <button type="button" className={s.live} onClick={onOpen}>
      <span className={s.liveMedia}>
        <img src={foodImage(d)} alt="" />
        <Badge tone="white" className={s.liveBadge}>
          {statusLabel[d.status]}
        </Badge>
      </span>
      <span className={s.liveBody}>
        <span className={s.liveTitle}>{d.title}</span>
        <span className={s.liveStatus}>{statusText(d)}</span>
        {waiting && <WaitingNote d={d} className={s.liveNote} />}
        <span className={s.liveBar} style={{ '--p': progressOf[d.status] ?? 0 } as CSSProperties} aria-hidden />
        <span className={s.liveFoot}>
          {d.volunteer ? (
            <span className={s.who}>
              <Avatar initials={d.volunteer.initials} size={26} tone="basil" />
              {d.volunteer.name}
            </span>
          ) : (
            <span className={s.who}>{qty(d)}</span>
          )}
          {waiting ? <PickupCloses to={d.pickupUntil} className={s.liveTime} /> : <span className={s.trackLink}>Track</span>}
        </span>
      </span>
    </button>
  );
}

// Meals delivered per day over the last two weeks
function Spark({ items }: { items: Donation[] }) {
  const days = useMemo(() => {
    const out: { label: string; meals: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86_400_000).toDateString();
      const meals = items.filter((d) => d.status === 'DELIVERED' && new Date(d.deliveredAt ?? d.createdAt).toDateString() === day).reduce((a, d) => a + d.meals, 0);
      out.push({ label: new Date(day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), meals });
    }
    return out;
  }, [items]);
  const max = Math.max(1, ...days.map((d) => d.meals));
  const total = days.reduce((a, d) => a + d.meals, 0);
  return (
    <div className={s.spark}>
      <p className={s.sparkTotal}>
        <strong>{num(total)}</strong> meals delivered
      </p>
      <div className={s.sparkBars} role="img" aria-label={`${total} meals delivered in the last 14 days`}>
        {days.map((d, i) => (
          <span key={i} title={`${d.label}: ${d.meals} meals`} style={{ height: `${Math.max(4, (d.meals / max) * 100)}%` }} data-zero={!d.meals || undefined} />
        ))}
      </div>
      <div className={s.sparkAxis} aria-hidden>
        <span>{days[0]!.label}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function Kitchens() {
  const { user } = useAuth();
  const [ngos, setNgos] = useState<NgoRef[] | null>(null);
  useEffect(() => {
    api.ngos().then(setNgos).catch(() => setNgos([]));
  }, []);
  const sorted = user && ngos ? [...ngos].sort((a, b) => haversineKm(user, a) - haversineKm(user, b)) : ngos;
  return (
    <Panel title="Kitchens near you" flush>
      {!sorted ? (
        <div className={s.tableSkel}>
          <Skeleton h={40} />
        </div>
      ) : (
        <ul className={s.kitchens}>
          {sorted.map((n) => (
            <li key={n.id}>
              <Avatar initials={n.name.split(' ').slice(0, 2).map((w) => w[0]).join('')} size={36} />
              <span>
                <strong>{n.name}</strong>
                <em>{n.address}</em>
              </span>
              {user && <span className={s.dist}>{km(haversineKm(user, n))}</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
