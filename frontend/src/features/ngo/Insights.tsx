import { useState, type CSSProperties } from 'react';
import { Download } from 'lucide-react';
import { Avatar, Button, Segmented, Skeleton } from '../../components/ui';
import { Columns, Kpi, KpiRow, Page, Panel, Topbar } from '../../components/dash';
import { api, shownError } from '../../lib/api';
import { categoryLabel, num } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { slotWords } from '../../lib/forecast';
import { categoryImage } from '../../lib/food';
import { BarChart } from './BarChart';
import { useSurplus } from './useSurplus';
import { asPct, useDashboard, weight, type Days } from './useDashboard';
import p from './page.module.css';

export function Insights() {
  const t = useT();
  const [days, setDays] = useState<Days>(7);
  const { data, error, refresh } = useDashboard(days);
  const surplus = useSurplus(56);
  const [kg, kgUnit] = data ? weight(data.foodKg) : ['–', ''];
  const [co2, co2Unit] = data ? weight(data.co2Kg) : ['–', ''];
  const f = data?.funnel;
  const funnel = f
    ? [
        { label: t('Posted'), value: f.posted },
        { label: t('Claimed'), value: f.claimed },
        { label: t('Picked up'), value: f.pickedUp },
        { label: t('Delivered'), value: f.delivered },
        { label: t('Expired'), value: f.expired, lost: true },
      ]
    : [];
  const categories = data ? [...data.categories].sort((a, b) => b.pct - a.pct) : [];

  return (
    <Page>
      <Topbar
        title={t('Insights')}
        subtitle={t('Last {n} days', { n: days })}
        actions={
          <>
            <Segmented
              label={t('Period')}
              value={days}
              onChange={setDays}
              options={[
                { value: 7, label: t('{n} days', { n: 7 }) },
                { value: 30, label: t('{n} days', { n: 30 }) },
              ]}
            />
            <Button variant="secondary" size="sm" icon={<Download size={16} strokeWidth={2} aria-hidden />} onClick={() => window.open(api.exportUrl(days), '_blank')}>
              {t('Export CSV')}
            </Button>
          </>
        }
      />

      {!data && error && (
        <div className={p.inlineError}>
          <span>{t('Couldn’t load insights.')} {shownError(error, t)}</span>
          <Button variant="secondary" size="sm" onClick={refresh}>
            {t('Try again')}
          </Button>
        </div>
      )}

      <KpiRow>
        <Kpi label={t('Meals rescued')} value={data ? num(data.mealsRescued) : '–'} />
        <Kpi label={t('Food diverted')} value={kg} unit={kgUnit} />
        <Kpi label={t('CO₂e avoided')} value={co2} unit={co2Unit} />
        <Kpi label={t('Median pickup')} value={data ? Math.round(data.medianPickupMinutes) : '–'} unit={t('min')} />
      </KpiRow>

      <Columns
        main={
          <>
            <Panel title={t('Meals per day')}>{data ? <BarChart data={data.perDay} hideCaption /> : <Skeleton h={220} r={12} />}</Panel>
            <Panel title={t('From post to plate')} action={data && <span className={p.note}>{t('{n}% delivered before expiry', { n: Math.round(asPct(data.deliveredBeforeExpiryPct)) })}</span>}>
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
            <Panel title={t('Expected surplus')} action={<span className={p.note}>{t('A pattern from past posts, not a promise')}</span>} flush>
              {!surplus.data ? (
                surplus.error ? (
                  <p className={p.quiet}>{t('Couldn’t load the forecast.')}</p>
                ) : (
                  <div className={p.pad}>
                    <Skeleton h={120} r={12} />
                  </div>
                )
              ) : surplus.data.forecast.length === 0 ? (
                <p className={p.quiet}>{t('No pattern yet. Donors who post in the same slot on two or more weeks appear here.')}</p>
              ) : (
                <ul className={p.forecast}>
                  {surplus.data.forecast.map((f) => (
                    <li key={`${f.donorId}-${f.from}`}>
                      <span className={p.forecastText}>
                        <strong>{f.donorName}</strong>
                        <span>{slotWords(f.from, f.until, t)}</span>
                        <em>{t('seen {seen} of last {total} weeks', { seen: f.weeksSeen, total: f.weeksLooked })}</em>
                      </span>
                      <span className={p.forecastMeals}>
                        <strong>{num(f.expectedMeals)}</strong> {t('meals')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        }
        side={
          <>
            <Panel title={t('What comes in')} flush>
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
                        <strong>{t(categoryLabel[c.category])}</strong>
                        <Bar value={asPct(c.pct)} max={100} />
                      </span>
                      <span className={p.num}>{Math.round(asPct(c.pct))}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title={t('Top volunteers')} flush>
              {!data ? (
                <div className={p.pad}>
                  <Skeleton h={40} />
                </div>
              ) : data.topVolunteers.length === 0 ? (
                <p className={p.quiet}>{t('Volunteers who deliver to you appear here.')}</p>
              ) : (
                <ol className={p.people}>
                  {data.topVolunteers.map((v, i) => (
                    <li key={v.id}>
                      <span className={p.rank}>{i + 1}</span>
                      <Avatar initials={v.initials} size={32} />
                      <span className={p.personText}>
                        <strong>{v.name}</strong>
                        <em>{t('{n} pickups', { n: v.pickups })}</em>
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
