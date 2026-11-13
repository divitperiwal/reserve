import type { CSSProperties, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Avatar, Logo } from '../ui';
import s from './shell.module.css';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  tab?: boolean;
  sidebar?: boolean;
  count?: number;
}

interface AppShellProps {
  home: string;
  nav: NavItem[];
  account?: { initials: string; name: string; sub: string; to: string };
  action?: ReactNode;
  hideTabs?: boolean;
  children: ReactNode;
}

const navClass = (base: string, active: string) => ({ isActive }: { isActive: boolean }) => (isActive ? `${base} ${active}` : base);

// Slim sidebar on desktop, translucent tab bar on phones
export function AppShell({ home, nav, account, action, hideTabs, children }: AppShellProps) {
  const tabs = nav.filter((n) => n.tab !== false);
  return (
    <div className={s.app}>
      <aside className={s.sidebar}>
        <Logo to={home} size={26} className={s.logo} />
        <nav aria-label="Main" className={s.nav}>
          {nav.filter((n) => n.sidebar !== false).map(({ to, label, icon: Icon, end, count }) => (
            <NavLink key={to} to={to} end={end} className={navClass(s.link, s.linkActive)}>
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              <span className={s.linkLabel}>{label}</span>
              {!!count && <span className={s.count}>{count}</span>}
            </NavLink>
          ))}
        </nav>
        {action && <div className={s.action}>{action}</div>}
        {account && (
          <NavLink to={account.to} className={s.account}>
            <Avatar initials={account.initials} size={34} tone="basil" />
            <span className={s.accountText}>
              <span className={s.accountName}>{account.name}</span>
              <span className={s.accountSub}>{account.sub}</span>
            </span>
          </NavLink>
        )}
      </aside>

      <main className={s.main}>{children}</main>

      {!hideTabs && <nav aria-label="Main" className={s.tabbar} style={{ '--tabs': tabs.length } as CSSProperties}>
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navClass(s.tab, s.tabActive)}>
            <Icon size={24} strokeWidth={1.75} aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>}
    </div>
  );
}
