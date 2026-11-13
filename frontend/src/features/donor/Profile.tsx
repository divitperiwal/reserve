import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Avatar, Badge, Button } from '../../components/ui';
import { Columns, Page, Panel, Topbar } from '../../components/dash';
import { useAuth } from '../../lib/auth';
import { num } from '../../lib/format';
import { useDonorData } from './DonorData';
import { co2For, kgLabel } from './donorKit';
import s from './pages.module.css';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { items } = useDonorData();
  const navigate = useNavigate();
  if (!user) return null;

  const delivered = (items ?? []).filter((d) => d.status === 'DELIVERED');
  const meals = delivered.reduce((a, d) => a + d.meals, 0);
  const kg = delivered.reduce((a, d) => a + d.weightKg, 0);

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
            <Panel title="Your impact">
              <dl className={s.impact}>
                <div>
                  <dt>Meals shared</dt>
                  <dd>{items ? num(meals) : '–'}</dd>
                </div>
                <div>
                  <dt>Deliveries</dt>
                  <dd>{items ? num(delivered.length) : '–'}</dd>
                </div>
                <div>
                  <dt>Food saved</dt>
                  <dd>{items ? kgLabel(kg) : '–'}</dd>
                </div>
                <div>
                  <dt>CO₂e avoided</dt>
                  <dd>{items ? kgLabel(co2For(kg)) : '–'}</dd>
                </div>
              </dl>
            </Panel>
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
