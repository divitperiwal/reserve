import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Avatar, Badge, Button } from '../../components/ui';
import { Columns, Page, Panel, Topbar } from '../../components/dash';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { num } from '../../lib/format';
import type { MyStats } from '../../lib/types';
import p from './page.module.css';

export function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<MyStats | null>(null);

  useEffect(() => {
    api.myStats().then(setStats).catch(() => setStats(null));
  }, []);

  if (!user) return null;

  return (
    <Page>
      <Topbar title={user.name} subtitle={user.orgType ?? 'NGO'} />

      <Columns
        main={
          <Panel title="Kitchen details" flush>
            <div className={p.identity}>
              <Avatar initials={user.initials} size={56} tone="basil" />
              <span>
                <strong>{user.name}</strong>
                <em>{user.orgType ?? 'NGO'}</em>
              </span>
            </div>
            <dl className={p.details}>
              <div>
                <dt>Mobile</dt>
                <dd>+91 {user.phone}</dd>
              </div>
              <div>
                <dt>Drop-off address</dt>
                <dd>{user.address}</dd>
              </div>
              <div>
                <dt>Accepting food</dt>
                <dd>
                  <Badge tone={user.acceptingFood ? 'fresh' : 'neutral'}>{user.acceptingFood ? 'Yes' : 'Paused'}</Badge>
                </dd>
              </div>
              <div>
                <dt>Verified</dt>
                <dd>
                  <Badge tone={user.verified ? 'fresh' : 'soon'}>{user.verified ? 'Yes' : 'Pending'}</Badge>
                </dd>
              </div>
            </dl>
          </Panel>
        }
        side={
          <>
            <Panel title={stats?.monthLabel ?? 'This month'}>
              <dl className={p.impact}>
                <div>
                  <dt>Deliveries</dt>
                  <dd>{stats ? num(stats.pickups) : '–'}</dd>
                </div>
                <div>
                  <dt>Meals received</dt>
                  <dd>{stats ? num(stats.meals) : '–'}</dd>
                </div>
              </dl>
            </Panel>
            <Panel title="Account">
              <div className={p.account}>
                <p>Signed in as {user.name}.</p>
                <Button
                  variant="danger"
                  block
                  icon={<LogOut size={18} strokeWidth={2} aria-hidden />}
                  onClick={() => {
                    signOut();
                    navigate('/', { replace: true });
                  }}
                >
                  Sign out
                </Button>
              </div>
            </Panel>
          </>
        }
      />
    </Page>
  );
}
