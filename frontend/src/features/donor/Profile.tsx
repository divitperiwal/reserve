import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Avatar, Badge, Button } from '../../components/ui';
import { Columns, Page, Panel, Topbar } from '../../components/dash';
import { useAuth } from '../../lib/auth';
import { ImpactCard } from '../impact/ImpactCard';
import s from './pages.module.css';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <Page>
      <Topbar title={user.name} subtitle={user.orgType ?? 'Donor'} />

      <Columns
        main={
          <Panel title="Organisation details" flush>
            <div className={s.identity}>
              <Avatar initials={user.initials} size={56} tone="basil" />
              <span>
                <strong>{user.name}</strong>
                <em>{user.orgType ?? 'Donor'}</em>
              </span>
            </div>
            <dl className={s.details}>
              <div>
                <dt>Mobile</dt>
                <dd>+91 {user.phone}</dd>
              </div>
              <div>
                <dt>Pickup address</dt>
                <dd>{user.address}</dd>
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
            <ImpactCard mealsLabel="Meals shared" />
            <Panel title="Account">
              <div className={s.account}>
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
