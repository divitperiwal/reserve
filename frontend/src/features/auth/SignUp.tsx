import { useState, type FormEvent } from 'react';
import { Bike, Building2, Check, LocateFixed, Store, type LucideIcon } from 'lucide-react';
import { Button, Chip, Field, Progress, labelClass } from '../../components/ui';
import { api } from '../../lib/api';
import { currentPosition } from '../../lib/format';
import type { Role } from '../../lib/types';
import { FormError, PasswordField, PhoneField } from './fields';
import { PHONE_ERROR, focusFirst, readError, useFinishAuth, validPhone, type Errors } from './authUtils';
import s from './AuthPage.module.css';

const TAMBARAM = { lat: 12.9249, lng: 80.1 };

const roleRows: { role: Role; icon: LucideIcon; title: string; sub: string }[] = [
  { role: 'DONOR', icon: Store, title: 'I have food to give', sub: 'Restaurants, hostels, events, homes' },
  { role: 'VOLUNTEER', icon: Bike, title: 'I can pick up and deliver', sub: 'Students, riders, anyone nearby' },
  { role: 'NGO', icon: Building2, title: 'We receive food', sub: 'Shelters and community kitchens' },
];

const roleNoun: Record<Role, string> = { DONOR: 'Donor', VOLUNTEER: 'Volunteer', NGO: 'NGO' };

const vehicles = ['Two-wheeler', 'Bicycle', 'Car', 'On foot'];
const orgTypes: Record<'DONOR' | 'NGO', string[]> = {
  DONOR: ['Restaurant', 'Hostel mess', 'Event venue', 'Bakery', 'Cafeteria', 'Home kitchen'],
  NGO: ['Shelter', 'Community kitchen', 'Children’s home', 'Old-age home'],
};

const stepOf: Record<string, 1 | 2 | 3> = { role: 1, name: 2, phone: 2, password: 2, vehicle: 2, orgType: 2, address: 3, lat: 3, lng: 3 };

const order: [string, string][] = [
  ['name', 'su-name'],
  ['phone', 'su-phone'],
  ['password', 'su-password'],
  ['address', 'su-address'],
];

const titles = { 1: 'Who are you?', 2: 'Your details', 3: 'Where are you based?' } as const;

export function SignUp({ initialRole }: { initialRole?: Role }) {
  const finish = useFinishAuth();
  const [step, setStep] = useState<1 | 2 | 3>(initialRole ? 2 : 1);
  const [role, setRole] = useState<Role | undefined>(initialRole);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [kind, setKind] = useState<Record<Role, string>>({ VOLUNTEER: vehicles[0]!, DONOR: orgTypes.DONOR[0]!, NGO: orgTypes.NGO[0]! });
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const check = (field: string, v: string) => {
    if (field === 'name') return v.trim().length < 2 ? 'Enter a name' : undefined;
    if (field === 'phone') return validPhone(v) ? undefined : PHONE_ERROR;
    if (field === 'password') return v.length < 6 ? 'Use at least 6 characters' : undefined;
    if (field === 'address') return v.trim().length < 3 ? 'Add an address so we can match you with nearby pickups' : undefined;
    return undefined;
  };

  const edit = (field: string, v: string, set: (v: string) => void) => {
    set(v);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: check(field, v) }));
  };

  const go = (next: 1 | 2 | 3) => {
    setStep(next);
    setFormError(undefined);
    requestAnimationFrame(() => document.getElementById(`su-step-${next}`)?.focus());
  };

  const pickRole = (r: Role) => {
    setRole(r);
    go(2);
  };

  const locate = async () => {
    setLocating(true);
    setErrors((e) => ({ ...e, address: undefined }));
    try {
      const pos = await currentPosition();
      setCoords(pos);
      if (!address.trim()) setAddress(`Near ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
    } catch (err) {
      setErrors((e) => ({ ...e, address: (err as Error).message }));
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) return go(1);
    if (step === 1) return go(2);
    if (step === 2) {
      const next: Errors = { name: check('name', name), phone: check('phone', phone), password: check('password', password) };
      setErrors(next);
      if (Object.values(next).some(Boolean)) return focusFirst(order, next);
      return go(3);
    }
    const addressError = check('address', address);
    if (addressError) {
      setErrors({ address: addressError });
      return focusFirst(order, { address: addressError });
    }
    setBusy(true);
    setFormError(undefined);
    try {
      const { lat, lng } = coords ?? TAMBARAM;
      const res = await api.register({
        role,
        name: name.trim(),
        phone,
        password,
        vehicle: role === 'VOLUNTEER' ? kind.VOLUNTEER : undefined,
        orgType: role === 'VOLUNTEER' ? undefined : kind[role],
        address: address.trim(),
        lat,
        lng,
      });
      finish(res);
    } catch (err) {
      const { fields, message } = readError(err);
      const first = Math.min(3, ...Object.keys(fields).map((f) => stepOf[f] ?? 3)) as 1 | 2 | 3;
      setErrors(fields);
      setFormError(message);
      if (first < 3) setStep(first);
      focusFirst(order, fields);
      setBusy(false);
    }
  };

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.progress}>
        <span className={s.stepCount}>
          Step {step} of 3{role && step > 1 ? `, ${roleNoun[role]} account` : ''}
        </span>
        <Progress value={step / 3} label={`Step ${step} of 3`} />
      </div>

      <div key={step} className={s.stepBody}>
        <h2 id={`su-step-${step}`} tabIndex={-1} className={s.stepTitle}>
          {titles[step]}
        </h2>

        {step === 1 && (
          <div role="radiogroup" aria-labelledby="su-step-1" className={s.roleList}>
            {roleRows.map(({ role: r, icon: Icon, title, sub }) => (
              <button key={r} type="button" role="radio" aria-checked={role === r} className={s.roleRow} onClick={() => pickRole(r)}>
                <span className={s.roleIcon}>
                  <Icon size={22} strokeWidth={1.75} aria-hidden />
                </span>
                <span className={s.roleText}>
                  <span className={s.roleTitle}>{title}</span>
                  <span className={s.roleSub}>{sub}</span>
                </span>
                <span className={s.roleCheck} aria-hidden>
                  {role === r && <Check size={18} strokeWidth={2.25} />}
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && role && (
          <>
            <Field
              id="su-name"
              label={role === 'VOLUNTEER' ? 'Full name' : 'Name of your place'}
              autoComplete={role === 'VOLUNTEER' ? 'name' : 'organization'}
              placeholder={role === 'VOLUNTEER' ? 'Priya S.' : role === 'NGO' ? 'Hope Kitchen Trust' : 'Hotel Annapoorna'}
              value={name}
              onChange={(e) => edit('name', e.target.value, setName)}
              onBlur={() => name && setErrors((x) => ({ ...x, name: check('name', name) }))}
              error={errors.name}
            />
            <PhoneField
              id="su-phone"
              value={phone}
              onChange={(v) => edit('phone', v, setPhone)}
              onBlur={() => phone && setErrors((x) => ({ ...x, phone: check('phone', phone) }))}
              error={errors.phone}
            />
            <PasswordField
              id="su-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => edit('password', e.target.value, setPassword)}
              error={errors.password}
              hint="At least 6 characters"
            />
            <fieldset className={s.chips}>
              <legend className={labelClass}>{role === 'VOLUNTEER' ? 'How do you get around?' : 'Type of place'}</legend>
              <div className={s.chipRow}>
                {(role === 'VOLUNTEER' ? vehicles : orgTypes[role]).map((o) => (
                  <Chip key={o} active={kind[role] === o} onClick={() => setKind((k) => ({ ...k, [role]: o }))}>
                    {o}
                  </Chip>
                ))}
              </div>
              {(errors.vehicle || errors.orgType) && <span className={s.inlineError}>{errors.vehicle ?? errors.orgType}</span>}
            </fieldset>
          </>
        )}

        {step === 3 && role && (
          <>
            <p className={s.stepLead}>
              {role === 'VOLUNTEER' ? 'We show you pickups near here first.' : 'Volunteers will come here to collect.'}
            </p>
            <Field
              id="su-address"
              label="Address"
              autoComplete="street-address"
              placeholder="SRM Nagar, Kattankulathur"
              value={address}
              onChange={(e) => edit('address', e.target.value, setAddress)}
              error={errors.address}
              hint={coords ? 'Pinned to your current location.' : undefined}
            />
            <Button
              variant="tinted"
              block
              onClick={locate}
              loading={locating}
              icon={coords ? <Check size={18} strokeWidth={2} aria-hidden /> : <LocateFixed size={18} strokeWidth={1.75} aria-hidden />}
            >
              {locating ? 'Finding you' : coords ? 'Location pinned' : 'Use my location'}
            </Button>
          </>
        )}
      </div>

      <FormError>{formError}</FormError>

      {(step > 1 || role) && (
        <div className={s.actions}>
          {step > 1 && (
            <Button variant="secondary" size="lg" onClick={() => go((step - 1) as 1 | 2)} disabled={busy}>
              Back
            </Button>
          )}
          <Button type="submit" size="lg" loading={busy} className={s.grow}>
            {step === 3 ? (busy ? 'Creating account' : 'Create account') : 'Continue'}
          </Button>
        </div>
      )}
    </form>
  );
}
