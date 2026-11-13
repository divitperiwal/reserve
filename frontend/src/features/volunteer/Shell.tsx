import { NavLink, Outlet } from 'react-router-dom';
import { Award, Bike, CircleUserRound } from 'lucide-react';
import f from './rider.module.css';

const tabs = [
  { to: '/volunteer', label: 'Task', icon: Bike, end: true },
  { to: '/volunteer/impact', label: 'Impact', icon: Award },
  { to: '/volunteer/profile', label: 'Profile', icon: CircleUserRound },
];

// Phone app chrome: content plus a bottom tab bar, on every screen size
export function Shell() {
  return (
    <>
      <Outlet />
      <nav aria-label="Main" className={f.tabbar}>
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? `${f.tab} ${f.tabActive}` : f.tab)}>
            <Icon size={24} strokeWidth={1.75} aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
