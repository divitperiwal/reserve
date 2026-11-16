import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Avatar, Badge, Button, LanguageSwitch, useToast } from '../../components/ui';
import { Columns, Page, Panel, Topbar } from '../../components/dash';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { usePushSetting } from '../../lib/push';
import { useT } from '../../lib/i18n';
import { num } from '../../lib/format';
import { monthName } from '../../lib/impact';
import type { MyStats } from '../../lib/types';
import { ImpactCard } from '../impact/ImpactCard';
import { NotificationsRow } from '../push/NotificationsRow';
import p from './page.module.css';

export function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();
  const push = usePushSetting((m) => toast(m, { error: true }));
  const [stats, setStats] = useState<MyStats | null>(null);

  useEffect(() => {
    api.myStats().then(setStats).catch(() => setStats(null));
  }, []);

  if (!user) return null;

  return (
    <Page>
      <Topbar title={user.name} subtitle={t(user.orgType ?? 'NGO')} />

      <Columns
        main={
          <Panel title={t('Kitchen details')} flush>
            <div className={p.identity}>
              <Avatar initials={user.initials} size={56} tone="basil" />
              <span>
                <strong>{user.name}</strong>
                <em>{t(user.orgType ?? 'NGO')}</em>
              </span>
            </div>
            <dl className={p.details}>
              <div>
                <dt>{t('Mobile')}</dt>
                <dd>+91 {user.phone}</dd>
              </div>
              <div>
                <dt>{t('Drop-off address')}</dt>
                <dd>{user.address}</dd>
              </div>
              <div>
                <dt>{t('Accepting food')}</dt>
                <dd>
                  <Badge tone={user.acceptingFood ? 'fresh' : 'neutral'}>{user.acceptingFood ? t('Yes') : t('Paused')}</Badge>
                </dd>
              </div>
              <div>
                <dt>{t('Verified')}</dt>
                <dd>
                  <Badge tone={user.verified ? 'fresh' : 'soon'}>{user.verified ? t('Yes') : t('Pending')}</Badge>
                </dd>
              </div>
            </dl>
          </Panel>
        }
        side={
          <>
            <ImpactCard mealsLabel={t('Meals received')} />
            <Panel title={t('Language')}>
              <LanguageSwitch block />
            </Panel>
            <Panel title={stats ? monthName() : t('This month')}>
              <dl className={p.impact}>
                <div>
                  <dt>{t('Deliveries')}</dt>
                  <dd>{stats ? num(stats.pickups) : '–'}</dd>
                </div>
                <div>
                  <dt>{t('Meals received')}</dt>
                  <dd>{stats ? num(stats.meals) : '–'}</dd>
                </div>
              </dl>
            </Panel>
            {push && (
              <Panel title={t('Notifications')} flush>
                <NotificationsRow push={push} subtitle={t('Critical food near your kitchen')} />
              </Panel>
            )}
            <Panel title={t('Account')}>
              <div className={p.account}>
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
