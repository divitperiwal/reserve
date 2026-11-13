import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, type LinkProps } from 'react-router-dom';
import { AlertCircle, Apple, Check, ChevronRight, Croissant, Package, Soup, Wheat, X, type LucideIcon } from 'lucide-react';
import type { Category, Diet, Urgency } from '../../lib/types';
import { clock, urgencyOf, useNow } from '../../lib/time';
import s from './ui.module.css';

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'tinted' | 'danger' | 'amber' | 'claim';
type Size = 'sm' | 'md' | 'lg';

const variantClass = (v: Variant) => (v === 'amber' ? s.dark : v === 'claim' ? s.tinted : s[v]);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', block, loading, icon, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(s.btn, variantClass(variant), size !== 'md' && s[size], block && s.block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={s.spinner} aria-hidden /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

export function ButtonLink({ variant = 'primary', size = 'md', block, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cx(s.btn, variantClass(variant), size !== 'md' && s[size], block && s.block, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, plain, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; plain?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx(s.iconBtn, plain && s.iconPlain, className)} {...rest}>
      {children}
    </button>
  );
}

type Tone = 'neutral' | 'critical' | 'criticalSoft' | 'soon' | 'fresh' | 'dark' | 'white' | 'amber' | 'basil';

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cx(s.badge, tone !== 'neutral' && s[`t-${tone}`], className)}>
      {dot && <span className={s.dot} aria-hidden />}
      {children}
    </span>
  );
}

export const urgencyTone: Record<Urgency, Tone> = { CRITICAL: 'critical', SOON: 'soon', FRESH: 'fresh', EXPIRED: 'neutral' };

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
  block,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  block?: boolean;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(s.seg, block && s.segBlock, className)}
      style={{ '--seg-n': options.length, '--seg-i': index } as CSSProperties}
    >
      <span className={s.segThumb} aria-hidden />
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={s.segItem} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return <button type="button" aria-pressed={!!active} className={cx(s.chip, className)} {...rest} />;
}

export function Avatar({ initials, size = 40, tone = 'soft', className }: { initials: string; size?: number; tone?: 'dark' | 'amber' | 'soft' | 'green' | 'basil'; className?: string }) {
  const t = tone === 'amber' ? 'dark' : tone === 'green' ? 'basil' : tone;
  return (
    <span aria-hidden className={cx(s.avatar, s[`a-${t}`], className)} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {initials}
    </span>
  );
}

export function Card({ as: Tag = 'div', className, children, style }: { as?: 'div' | 'section' | 'article' | 'aside' | 'li'; className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <Tag className={cx(s.card, className)} style={style}>
      {children}
    </Tag>
  );
}

// Apple-style inset grouped list: optional header and footer around rows
export function Group({ title, action, footer, children, className }: { title?: ReactNode; action?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx(s.group, className)}>
      {(title || action) && (
        <header className={s.groupHead}>
          {title && <h2 className={s.groupTitle}>{title}</h2>}
          {action}
        </header>
      )}
      <div className={s.groupBody}>{children}</div>
      {footer && <p className={s.groupFoot}>{footer}</p>}
    </section>
  );
}

interface RowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
}

export function Row({ leading, title, subtitle, trailing, to, onClick, chevron, className }: RowProps) {
  const body = (
    <>
      {leading && <span className={s.rowLead}>{leading}</span>}
      <span className={s.rowMain}>
        <span className={s.rowTitle}>{title}</span>
        {subtitle && <span className={s.rowSub}>{subtitle}</span>}
      </span>
      {trailing && <span className={s.rowTrail}>{trailing}</span>}
      {(chevron ?? !!(to || onClick)) && <ChevronRight className={s.rowChevron} size={18} strokeWidth={2} aria-hidden />}
    </>
  );
  if (to)
    return (
      <Link to={to} className={cx(s.row, s.rowAction, className)}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cx(s.row, s.rowAction, className)}>
        {body}
      </button>
    );
  return <div className={cx(s.row, className)}>{body}</div>;
}

export function PageHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cx(s.pageHead, className)}>
      <div className={s.pageHeadText}>
        <h1 className={s.pageTitle}>{title}</h1>
        {subtitle && <p className={s.pageSub}>{subtitle}</p>}
      </div>
      {actions && <div className={s.pageActions}>{actions}</div>}
    </header>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={s.toggle} onClick={() => onChange(!checked)}>
      <span className={s.toggleKnob} aria-hidden />
    </button>
  );
}

// Bottom sheet on phones, centred dialog on larger screens; Escape and backdrop close it
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className={s.sheetRoot}>
      <button type="button" className={s.scrim} aria-label="Close" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className={s.sheet}>
        <span className={s.grabber} aria-hidden />
        {title && (
          <header className={s.sheetHead}>
            <h2 className={s.sheetTitle}>{title}</h2>
            <IconButton label="Close" plain onClick={onClose}>
              <X size={18} strokeWidth={2} />
            </IconButton>
          </header>
        )}
        <div className={s.sheetBody}>{children}</div>
        {footer && <footer className={s.sheetFoot}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  multiline?: boolean;
}

export function Field({ label, error, hint, multiline, className, id, ...rest }: FieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  const describedBy = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;
  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={fid} className={s.label}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={fid}
          className={s.input}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          {...(rest as unknown as InputHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input id={fid} className={s.input} aria-invalid={!!error || undefined} aria-describedby={describedBy} {...rest} />
      )}
      {error ? (
        <span id={`${fid}-err`} className={s.error}>
          <AlertCircle size={14} aria-hidden /> {error}
        </span>
      ) : hint ? (
        <span id={`${fid}-hint`} className={s.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export const inputClass = s.input;
export const labelClass = s.label;
export const errorClass = s.error;

export function Progress({ value, tone = 'green', label }: { value: number; tone?: 'critical' | 'soon' | 'fresh' | 'expired' | 'green' | 'ink'; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={s.track} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx(s.fill, s[`f-${tone}`])} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Live ticking countdown to best-before; only critical items turn red
export function Countdown({ to, className, format = 'clock' }: { to: string; className?: string; format?: 'clock' | 'short' }) {
  const now = useNow();
  const left = new Date(to).getTime() - now;
  const u = urgencyOf(to, now).toLowerCase();
  let text: string;
  if (left <= 0) text = 'Expired';
  else if (format === 'clock') text = clock(left);
  else {
    const m = Math.floor(left / 60_000);
    const h = Math.floor(m / 60);
    text = h ? `${h}h ${m % 60}m left` : `${m % 60}m left`;
  }
  return (
    <span className={cx(s.countdown, s[`cd-${u}`], className)} role="timer" aria-label={`${text} until best before`}>
      {text}
    </span>
  );
}

export const categoryIcon: Record<Category, LucideIcon> = {
  COOKED: Soup,
  BAKERY: Croissant,
  FRUIT_VEG: Apple,
  PACKAGED: Package,
  RAW: Wheat,
};

export function FoodGlyph({ category, size = 44, iconSize, className, style }: { category: Category; size?: number | string; iconSize?: number; className?: string; style?: CSSProperties }) {
  const Icon = categoryIcon[category];
  return (
    <span aria-hidden className={cx(s.glyph, className)} style={{ width: size, height: size, ...style }}>
      <Icon size={iconSize ?? (typeof size === 'number' ? Math.round(size * 0.48) : 24)} strokeWidth={1.75} />
    </span>
  );
}

export function DietMark({ diet }: { diet: Diet }) {
  return <span className={cx(s.diet, s[`d-${diet}`])} role="img" aria-label={diet === 'VEG' ? 'Vegetarian' : 'Non-vegetarian'} />;
}

export function Skeleton({ w = '100%', h = 16, r, className }: { w?: number | string; h?: number | string; r?: number; className?: string }) {
  return <span aria-hidden className={cx(s.skeleton, className)} style={{ display: 'block', width: w, height: h, borderRadius: r }} />;
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <Icon size={32} strokeWidth={1.5} aria-hidden className={s.emptyIcon} />
      <p className={s.emptyTitle}>{title}</p>
      {children && <p className={s.emptyText}>{children}</p>}
      {action}
    </div>
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--basil)" />
      <path d="M16 24c0-5 0-9 0-12M16 15c-3.2 0-5.6-2.2-5.6-5.6 3.2 0 5.6 2.2 5.6 5.6Zm0 0c3.2 0 5.6-2.2 5.6-5.6-3.2 0-5.6 2.2-5.6 5.6Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ to = '/', size = 28, className }: { to?: string; size?: number; className?: string }) {
  return (
    <Link to={to} className={cx(s.logo, className)} aria-label="ReServe home">
      <LogoMark size={size} />
      <span>ReServe</span>
    </Link>
  );
}

// Claimed, picked up, delivered progress with the current step highlighted
export function Stepper({ step, onDark }: { step: 0 | 1 | 2 | 3; onDark?: boolean }) {
  const labels = ['Claimed', 'Picked up', 'Delivered'];
  const dot = (i: number) => {
    const done = step > i || step === 3;
    const now = step === i && step !== 3;
    return <span className={cx(s.stepDot, done && s.stepDone, now && s.stepNow)}>{done && <Check size={12} strokeWidth={3} aria-hidden />}</span>;
  };
  return (
    <div className={cx(onDark && s.onDark)} aria-label={`Status: ${labels[Math.min(step, 2)]}`}>
      <div className={s.stepper}>
        {dot(0)}
        <span className={cx(s.stepLine, step >= 1 && s.stepLineDone)} />
        {dot(1)}
        <span className={cx(s.stepLine, step >= 2 && s.stepLineDone)} />
        {dot(2)}
      </div>
      <div className={s.stepLabels}>
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

interface ToastItem {
  id: number;
  text: string;
  error?: boolean;
}

const ToastContext = createContext<(text: string, opts?: { error?: boolean }) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, opts?: { error?: boolean }) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, text, error: opts?.error }]);
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className={s.toastHost} role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx(s.toast, t.error && s.toastError)}>
            {t.error ? <AlertCircle size={18} aria-hidden /> : <Check size={18} aria-hidden />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
