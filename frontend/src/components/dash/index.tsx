import type { ReactNode } from 'react';
import { cx } from '../ui';
import { foodImage } from '../../lib/food';
import type { Donation } from '../../lib/types';
import s from './dash.module.css';

// Sticky page bar: title on the left, actions on the right
export function Topbar({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className={s.topbar}>
      <div className={s.topTitle}>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className={s.topActions}>{actions}</div>}
    </header>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(s.page, className)}>{children}</div>;
}

// Main column plus a narrower side column on laptops; stacks on phones
export function Columns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className={s.columns}>
      <div className={s.main}>{main}</div>
      <aside className={s.side}>{side}</aside>
    </div>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <dl className={s.kpis}>{children}</dl>;
}

export function Kpi({ label, value, unit, note, tone, icon }: { label: string; value: ReactNode; unit?: string; note?: ReactNode; tone?: 'basil' | 'red'; icon?: ReactNode }) {
  return (
    <div className={cx(s.kpi, tone && s[`kpi-${tone}`])}>
      <dt>
        {icon && <span className={s.kpiIcon}>{icon}</span>}
        {label}
      </dt>
      <dd className={s.kpiValue}>
        {value}
        {unit && <small> {unit}</small>}
      </dd>
      {note && <dd className={s.kpiNote}>{note}</dd>}
    </div>
  );
}

export function Panel({ title, action, children, flush, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; flush?: boolean; className?: string }) {
  return (
    <section className={cx(s.panel, className)}>
      {(title || action) && (
        <header className={s.panelHead}>
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      <div className={cx(s.panelBody, flush && s.flush)}>{children}</div>
    </section>
  );
}

export function SectionHead({ title, count, action }: { title: ReactNode; count?: number; action?: ReactNode }) {
  return (
    <header className={s.sectionHead}>
      <h2>
        {title}
        {count !== undefined && <span>{count}</span>}
      </h2>
      {action}
    </header>
  );
}

export function FoodThumb({ d, size = 56 }: { d: Pick<Donation, 'title' | 'category' | 'photoUrl'>; size?: number }) {
  return <img className={s.thumb} src={foodImage(d)} alt="" width={size} height={size} style={{ width: size, height: size }} loading="lazy" />;
}
