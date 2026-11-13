import { Bike, Building2, HandHeart, PackagePlus, Soup, Store, type LucideIcon } from 'lucide-react';
import { ButtonLink, Logo, Skeleton } from '../../components/ui';
import { homeFor, useAuth } from '../../lib/auth';
import { num, tonnes } from '../../lib/format';
import type { Role } from '../../lib/types';
import { PickupPreview } from './PickupPreview';
import { usePublicStats } from './usePublicStats';
import s from './LandingPage.module.css';

const steps: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: PackagePlus, title: 'Post what’s left', text: 'Tell us what you have. We suggest pickup times from the type of food, so it takes under a minute.' },
  { icon: Soup, title: 'A kitchen takes what it needs', text: 'Nearby kitchens see your post and accept all of it or just part. Whatever is left stays open for others.' },
  { icon: Bike, title: 'A volunteer delivers it', text: 'One pickup at a time, with a 4-digit code at both handovers. If nobody shows in 30 minutes, another volunteer is found.' },
];

const roles: { role: Role; icon: LucideIcon; title: string; text: string; cta: string }[] = [
  { role: 'DONOR', icon: Store, title: 'Donors', text: 'Restaurants, hostels, event halls and home kitchens with food to spare.', cta: 'Start donating' },
  { role: 'VOLUNTEER', icon: HandHeart, title: 'Volunteers', text: 'Students and riders who can spare twenty minutes. You pick up food a kitchen has asked for, one pickup at a time.', cta: 'Start volunteering' },
  { role: 'NGO', icon: Building2, title: 'NGOs', text: 'Shelters and community kitchens that choose what and how much they take. Pause intake whenever you are full.', cta: 'Register your NGO' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const start = (role: Role) => (user ? homeFor(user.role) : `/auth?role=${role}`);

  return (
    <div className={s.page}>
      <header className={s.nav}>
        <div className={s.navInner}>
          <Logo />
          <nav className={s.links} aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#impact">Impact</a>
            <a href="#roles">Who it’s for</a>
          </nav>
          <div className={s.navActions}>
            {user ? (
              <ButtonLink to={homeFor(user.role)} size="sm">
                Open dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/auth" variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/auth?role=DONOR" size="sm">
                  Donate food
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className={s.hero}>
          <div className={s.heroText}>
            <h1 className={s.headline}>Good food should never go to waste.</h1>
            <p className={s.lede}>Post your surplus, a nearby kitchen takes what it needs, and a volunteer delivers it before it expires.</p>
            <div className={s.ctas}>
              <ButtonLink to={start('DONOR')} size="lg">
                Donate food
              </ButtonLink>
              <ButtonLink to={start('VOLUNTEER')} size="lg" variant="secondary">
                Volunteer a pickup
              </ButtonLink>
            </div>
          </div>
          <div className={s.heroVisual}>
            <PickupPreview />
          </div>
        </section>

        <section id="how" className={s.section} aria-labelledby="how-title">
          <h2 id="how-title" className={s.sectionTitle}>
            From surplus to plate in under an hour.
          </h2>
          <ol className={s.steps}>
            {steps.map(({ icon: Icon, title, text }) => (
              <li key={title} className={s.step}>
                <Icon size={28} strokeWidth={1.75} className={s.icon} aria-hidden />
                <h3 className={s.itemTitle}>{title}</h3>
                <p className={s.itemText}>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <Impact />

        <section id="roles" className={s.section} aria-labelledby="roles-title">
          <h2 id="roles-title" className={s.sectionTitle}>
            Three ways to help.
          </h2>
          <ul className={s.roles}>
            {roles.map(({ role, icon: Icon, title, text, cta }) => (
              <li key={role} className={s.role}>
                <Icon size={28} strokeWidth={1.75} className={s.icon} aria-hidden />
                <h3 className={s.itemTitle}>{title}</h3>
                <p className={s.itemText}>{text}</p>
                <ButtonLink to={start(role)} variant="ghost" className={s.roleLink}>
                  {cta}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </section>

        <section className={s.closing} aria-labelledby="closing-title">
          <h2 id="closing-title" className={s.closingTitle}>
            Someone nearby cooked too much tonight.
          </h2>
          <ButtonLink to={start('DONOR')} size="lg">
            {user ? 'Open dashboard' : 'Get started'}
          </ButtonLink>
        </section>
      </main>

      <footer className={s.footer}>
        <span>ReServe, rescuing food around Tambaram and Chengalpattu.</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}

// Three headline numbers; skeletons while loading, the whole section hides if the request fails
function Impact() {
  const stats = usePublicStats();
  if (stats.status === 'error') return null;
  const items =
    stats.status === 'ok'
      ? [
          { value: num(stats.data.mealsRescued), label: 'meals rescued' },
          { value: tonnes(stats.data.foodKg), label: 'of food kept out of landfill' },
          { value: `${Math.round(stats.data.deliveredBeforeExpiryPct)}%`, label: 'delivered before expiry' },
        ]
      : null;

  return (
    <section id="impact" className={s.section} aria-labelledby="impact-title" aria-busy={!items}>
      <h2 id="impact-title" className={s.sectionTitle}>
        What we’ve rescued so far.
      </h2>
      <dl className={s.stats}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={s.stat}>
            {items ? (
              <>
                <dt className={s.statLabel}>{items[i]!.label}</dt>
                <dd className={s.statValue}>{items[i]!.value}</dd>
              </>
            ) : (
              <>
                <Skeleton w="60%" h={64} r={12} />
                <Skeleton w="45%" h={18} />
              </>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
