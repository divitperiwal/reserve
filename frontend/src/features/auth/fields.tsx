import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cx, errorClass, labelClass } from '../../components/ui';
import { digits } from './authUtils';
import s from './AuthPage.module.css';

interface BaseProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
}

function Shell({ id, label, error, hint, children }: BaseProps & { children: ReactNode }) {
  return (
    <div className={s.field}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-err`} className={errorClass}>
          <AlertCircle size={14} strokeWidth={1.75} aria-hidden /> {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className={s.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) => (error ? `${id}-err` : hint ? `${id}-hint` : undefined);

export function PhoneField({
  id,
  label = 'Mobile number',
  value,
  onChange,
  onBlur,
  error,
  hint,
}: Omit<BaseProps, 'label'> & { label?: string; value: string; onChange: (v: string) => void; onBlur?: () => void }) {
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <div className={cx(s.control, !!error && s.invalid)}>
        <span className={s.prefix} aria-hidden>
          +91
        </span>
        <input
          id={id}
          className={s.bare}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98401 00001"
          maxLength={10}
          value={value}
          onChange={(e) => onChange(digits(e.target.value, 10))}
          onBlur={onBlur}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(id, error, hint)}
        />
      </div>
    </Shell>
  );
}

export function PasswordField({
  id,
  label = 'Password',
  error,
  hint,
  ...rest
}: Omit<BaseProps, 'label'> & { label?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'>) {
  const [shown, setShown] = useState(false);
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <div className={cx(s.control, !!error && s.invalid)}>
        <input
          id={id}
          className={s.bare}
          type={shown ? 'text' : 'password'}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(id, error, hint)}
          {...rest}
        />
        <button type="button" className={s.reveal} onClick={() => setShown((v) => !v)} aria-label={shown ? 'Hide password' : 'Show password'}>
          {shown ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
        </button>
      </div>
    </Shell>
  );
}

export function FormError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className={s.formError}>
      <AlertCircle size={16} strokeWidth={1.75} aria-hidden />
      {children}
    </p>
  );
}
