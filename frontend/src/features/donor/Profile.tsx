import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Avatar, Badge, Button, LanguageSwitch, useToast } from '../../components/ui';
import { Columns, Page, Panel, Topbar } from '../../components/dash';
import { useAuth } from '../../lib/auth';
import { usePushSetting } from '../../lib/push';
import { useT } from '../../lib/i18n';
import { ImpactCard } from '../impact/ImpactCard';
import { NotificationsRow } from '../push/NotificationsRow';
import s from './pages.module.css';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();
  const push = usePushSetting((m) => toast(m, { error: true }));
  if (!user) return null;

  return (
    <Page>
      <Topbar title={user.name} subtitle={t(user.orgType ?? 'Donor')} />

      <Columns
        main={
          <Panel title={t('Organisation details')} flush>
            <div className={s.identity}>
              <Avatar initials={user.initials} size={56} tone="basil" />
              <span>
                <strong>{user.name}</strong>
                <em>{t(user.orgType ?? 'Donor')}</em>
              </span>
            </div>
            <dl className={s.details}>
              <div>
                <dt>{t('Mobile')}</dt>
                <dd>+91 {user.phone}</dd>
              </div>
              <div>
                <dt>{t('Pickup address')}</dt>
                <dd>{user.address}</dd>
              </div>
              <div>
                <dt>{t('Verified')}</dt>
                <dd>
                  <Badge tone={user.verified ? 'fresh' : 'soon'}>{t(user.verified ? 'Yes' : 'Pending')}</Badge>
                </dd>
              </div>
            </dl>
          </Panel>
        }
        side={
          <>
            <ImpactCard mealsLabel={t('Meals shared')} />
            <Panel title={t('Language')}>
              <LanguageSwitch block />
            </Panel>
            {push && (
              <Panel title={t('Notifications')} flush>
                <NotificationsRow push={push} subtitle={t('Alerts on this device')} />
              </Panel>
            )}
            <Panel title={t('Account')}>
              <div className={s.account}>
                <p>{t('Signed in as {name}.', { name: user.name })}</p>
                <Button
                  variant="danger"
                  block
                  icon={<LogOut size={18} strokeWidth={2} aria-hidden />}
                  onClick={() => {
                    signOut();
                    navigate('/', { replace: true });
                  }}
                >
                  {t('Sign out')}
                </Button>
              </div>
            </Panel>
          </>
        }
      />
    </Page>
  );
}
