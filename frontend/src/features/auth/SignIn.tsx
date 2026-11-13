import { useState, type FormEvent } from 'react';
import { Button, Field } from '../../components/ui';
import { api } from '../../lib/api';
import { FormError, PasswordField, PhoneField } from './fields';
import { PHONE_ERROR, digits, focusFirst, readError, useFinishAuth, validPhone, type Errors } from './authUtils';
import s from './AuthPage.module.css';

const order: [string, string][] = [
  ['phone', 'si-phone'],
  ['password', 'si-password'],
  ['code', 'si-code'],
];

export function SignIn() {
  const finish = useFinishAuth();
  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<{ devCode?: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const fail = (err: unknown) => {
    const { fields, message } = readError(err);
    setErrors(fields);
    setFormError(message);
    focusFirst(order, fields);
    setBusy(false);
  };

  const invalid = (next: Errors) => {
    setErrors(next);
    setFormError(undefined);
    if (!Object.values(next).some(Boolean)) return false;
    focusFirst(order, next);
    return true;
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid({ phone: validPhone(phone) ? undefined : PHONE_ERROR, password: password ? undefined : 'Enter your password' })) return;
    setBusy(true);
    try {
      finish(await api.login(phone, password));
    } catch (err) {
      fail(err);
    }
  };

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    if (invalid({ phone: validPhone(phone) ? undefined : PHONE_ERROR })) return;
    setBusy(true);
    try {
      const res = await api.requestOtp(phone);
      setSent({ devCode: res.devCode });
      setCode('');
      setBusy(false);
      requestAnimationFrame(() => document.getElementById('si-code')?.focus());
    } catch (err) {
      fail(err);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid({ code: code.length === 6 ? undefined : 'Enter the 6-digit code' })) return;
    setBusy(true);
    try {
      finish(await api.verifyOtp(phone, code));
    } catch (err) {
      fail(err);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'password' ? 'code' : 'password'));
    setSent(null);
    setErrors({});
    setFormError(undefined);
  };

  const phoneField = (
    <PhoneField
      id="si-phone"
      value={phone}
      onChange={(v) => {
        setPhone(v);
        if (errors.phone && validPhone(v)) setErrors((x) => ({ ...x, phone: undefined }));
      }}
      onBlur={() => phone && setErrors((x) => ({ ...x, phone: validPhone(phone) ? undefined : PHONE_ERROR }))}
      error={errors.phone}
    />
  );

  if (mode === 'password')
    return (
      <form key="password" className={s.form} onSubmit={submitPassword} noValidate>
        {phoneField}
        <PasswordField
          id="si-password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((x) => ({ ...x, password: undefined }));
          }}
          error={errors.password}
        />
        <FormError>{formError}</FormError>
        <Button type="submit" size="lg" block loading={busy}>
          {busy ? 'Signing in' : 'Sign in'}
        </Button>
        <button type="button" className={s.textLink} onClick={switchMode}>
          Sign in with a code instead
        </button>
      </form>
    );

  return (
    <form key="code" className={s.form} onSubmit={sent ? verify : sendCode} noValidate>
      {phoneField}
      {sent && (
        <Field
          id="si-code"
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className={s.codeField}
          value={code}
          onChange={(e) => {
            setCode(digits(e.target.value, 6));
            if (errors.code) setErrors((x) => ({ ...x, code: undefined }));
          }}
          error={errors.code}
          hint={
            <>
              Sent to +91 {phone}.{sent.devCode && <> Demo code: <strong className={s.devCode}>{sent.devCode}</strong></>}
            </>
          }
        />
      )}
      <FormError>{formError}</FormError>
      <Button type="submit" size="lg" block loading={busy}>
        {sent ? (busy ? 'Verifying' : 'Verify and sign in') : busy ? 'Sending code' : 'Send code'}
      </Button>
      <div className={s.linkRow}>
        <button type="button" className={s.textLink} onClick={switchMode}>
          Use password instead
        </button>
        {sent && (
          <button type="button" className={s.textLink} onClick={() => sendCode()} disabled={busy}>
            Resend code
          </button>
        )}
      </div>
    </form>
  );
}
