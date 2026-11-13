import { useState, type CSSProperties } from 'react';
import { Download } from 'lucide-react';
import { Avatar, Button, Segmented, Skeleton } from '../../components/ui';
import { Columns, Kpi, KpiRow, Page, Panel, Topbar } from '../../components/dash';
import { api } from '../../lib/api';
import { categoryLabel, num } from '../../lib/format';
import { categoryImage } from '../../lib/food';
import { BarChart } from './BarChart';
import { asPct, useDashboard, weight, type Days } from './useDashboard';
import p from './page.module.css';

export function Insights() {
  const [days, setDays] = useState<Days>(7);
  const { data, error, refresh } = useDashboard(days);
  const [kg, kgUnit] = data ? weight(data.foodKg) : ['–', ''];
  const [co2, co2Unit] = data ? weight(data.co2Kg) : ['–', ''];
  const f = data?.funnel;
  const funnel = f
    ? [
        { label: 'Posted', value: f.posted },
        { label: 'Claimed', value: f.claimed },
        { label: 'Picked up', value: f.pickedUp },
        { label: 'Delivered', value: f.delivered },
        { label: 'Expired', value: f.expired, lost: true },
      ]
    : [];
  const categories = data ? [...data.categories].sort((a, b) => b.pct - a.pct) : [];

  return (
    <Page>
      <Topbar
        title="Insights"
        subtitle={`Last ${days} days`}
        actions={
          <>
            <Segmented
              label="Period"
              value={days}
              onChange={setDays}
              options={[
                { value: 7, label: '7 days' },
                { value: 30, label: '30 days' },
              ]}
            />
            <Button variant="secondary" size="sm" icon={<Download size={16} strokeWidth={2} aria-hidden />} onClick={() => window.open(api.exportUrl(days), '_blank')}>
              Export CSV
            </Button>
          </>
        }
      />

      {!data && error && (
        <div className={p.inlineError}>
          <span>Couldn’t load insights. {error}</span>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Try again
          </Button>
        </div>
      )}

      <KpiRow>
        <Kpi label="Meals rescued" value={data ? num(data.mealsRescued) : '–'} />
        <Kpi label="Food diverted" value={kg} unit={kgUnit} />
        <Kpi label="CO₂e avoided" value={co2} unit={co2Unit} />
        <Kpi label="Median pickup" value={data ? Math.round(data.medianPickupMinutes) : '–'} unit="min" />
      </KpiRow>

      <Columns
        main={
          <>
            <Panel title="Meals per day">{data ? <BarChart data={data.perDay} hideCaption /> : <Skeleton h={220} r={12} />}</Panel>
            <Panel title="From post to plate" action={data && <span className={p.note}>{Math.round(asPct(data.deliveredBeforeExpiryPct))}% delivered before expiry</span>}>
              {!data ? (
                <Skeleton h={180} r={12} />
              ) : (
                <ul className={p.bars}>
                  {funnel.map((x) => (
                    <li key={x.label} data-lost={x.lost || undefined}>
                      <span className={p.barLabel}>{x.label}</span>
                      <Bar value={x.value} max={f!.posted} />
                      <span className={p.num}>{num(x.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        }
        side={
          <>
            <Panel title="What comes in" flush>
              {!data ? (
                <div className={p.pad}>
                  <Skeleton h={120} r={12} />
                </div>
              ) : (
                <ul className={p.cats}>
                  {categories.map((c) => (
                    <li key={c.category}>
                      <img src={categoryImage(c.category)} alt="" width={40} height={40} loading="lazy" />
                      <span className={p.catText}>
                        <strong>{categoryLabel[c.category]}</strong>
                        <Bar value={asPct(c.pct)} max={100} />
                      </span>
                      <span className={p.num}>{Math.round(asPct(c.pct))}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Top volunteers" flush>
              {!data ? (
                <div className={p.pad}>
                  <Skeleton h={40} />
                </div>
              ) : data.topVolunteers.length === 0 ? (
                <p className={p.quiet}>Volunteers who deliver to you appear here.</p>
              ) : (
                <ol className={p.people}>
                  {data.topVolunteers.map((v, i) => (
                    <li key={v.id}>
                      <span className={p.rank}>{i + 1}</span>
                      <Avatar initials={v.initials} size={32} />
                      <span className={p.personText}>
                        <strong>{v.name}</strong>
                        <em>{v.pickups} pickups</em>
                      </span>
                      <span className={p.num}>{num(v.meals)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </>
        }
      />
    </Page>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span className={p.hbar} aria-hidden>
      <span style={{ '--w': `${max ? (value / max) * 100 : 0}%` } as CSSProperties} />
    </span>
  );
}
