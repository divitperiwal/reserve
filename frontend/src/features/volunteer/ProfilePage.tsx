import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Avatar, Button, Chip, Field, Group, LanguageSwitch, Row, Sheet, Toggle, useToast } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { usePushSetting } from '../../lib/push';
import { useT } from '../../lib/i18n';
import { NotificationsRow } from '../push/NotificationsRow';
import { useVolunteer } from './context';
import s from './volunteer.module.css';

const vehicles = ['Two-wheeler', 'Bicycle', 'Car', 'On foot'];

export default function ProfilePage() {
  const { user, setOnDuty, updateProfile } = useVolunteer();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(false);
  const toast = useToast();
  const t = useT();
  const push = usePushSetting((m) => toast(m, { error: true }));

  return (
    <div className={s.page}>
      <header className={s.me}>
        <Avatar initials={user.initials} size={72} tone="basil" />
        <h1>{user.name}</h1>
        <span className={s.meSub}>
          {user.rating > 0 && (
            <span className={s.rating}>
              <Star size={14} strokeWidth={1.75} className={s.star} aria-hidden />
              {user.rating.toFixed(1)}
            </span>
          )}
          {user.vehicle ? t(user.vehicle) : t('Vehicle not set')}
        </span>
        <span className={s.online} data-on={user.onDuty || undefined}>
          <span className={s.onlineDot} aria-hidden />
          {user.onDuty ? t('Online') : t('Offline')}
        </span>
      </header>

      <div className={s.settings}>
        <Group footer={t('When you are off duty, new pickups are not shown to you.')}>
          <Row title={t('On duty')} trailing={<Toggle label={t('On duty')} checked={user.onDuty} onChange={setOnDuty} />} chevron={false} />
        </Group>

        {push && (
          <Group>
            <NotificationsRow push={push} subtitle={t('Pickups near you that need a volunteer')} />
          </Group>
        )}

        <Group title={t('Language')}>
          <div className={s.langRow}>
            <LanguageSwitch block />
          </div>
        </Group>

        <Group title={t('Delivery')}>
          <Row title={t('Vehicle')} trailing={user.vehicle ? t(user.vehicle) : t('Not set')} onClick={() => setSheet(true)} />
          <Row title={t('Home area')} trailing={<span className={s.truncate}>{user.address}</span>} chevron={false} />
        </Group>

        <Group title={t('Account')}>
          <Row title={t('Name')} subtitle={user.verified ? t('+91 {phone}, verified', { phone: user.phone }) : `+91 ${user.phone}`} trailing={user.name} onClick={() => setSheet(true)} />
        </Group>

        <button
          type="button"
          className={s.signOut}
          onClick={() => {
            signOut();
            navigate('/', { replace: true });
          }}
        >
          {t('Sign out')}
        </button>
      </div>

      <EditSheet open={sheet} onClose={() => setSheet(false)} name={user.name} vehicle={user.vehicle ?? vehicles[0]!} onSave={updateProfile} />
    </div>
  );
}

function EditSheet({
  open,
  onClose,
  name: initialName,
  vehicle: initialVehicle,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  vehicle: string;
  onSave: (p: { name: string; vehicle: string }) => Promise<boolean>;
}) {
  const [name, setName] = useState(initialName);
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [busy, setBusy] = useState(false);
  const t = useT();
  const invalid = name.trim().length < 2;

  const save = async () => {
    setBusy(true);
    const ok = await onSave({ name: name.trim(), vehicle });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Edit profile')}
      footer={
        <Button size="lg" block loading={busy} disabled={invalid} onClick={save}>
          {t('Save')}
        </Button>
      }
    >
      <div className={s.form}>
        <Field label={t('Name')} value={name} onChange={(e) => setName(e.target.value)} error={invalid ? t('Enter your name') : undefined} />
        <div className={s.field}>
          <span className={s.label}>{t('Vehicle')}</span>
          <div className={s.chips}>
            {vehicles.map((v) => (
              <Chip key={v} active={vehicle === v} onClick={() => setVehicle(v)}>
                {t(v)}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
