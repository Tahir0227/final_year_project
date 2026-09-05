import { NavLink, Link } from 'react-router-dom';
import {
  HomeIcon, FolderIcon, PlusCircleIcon, BellIcon, UserCircleIcon, BookOpenIcon
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard',     label: 'Dashboard',     icon: HomeIcon },
  { to: '/projects',      label: 'My Projects',   icon: FolderIcon },
  { to: '/add-project',   label: 'Add Project',   icon: PlusCircleIcon },
  { to: '/notifications', label: 'Alerts',        icon: BellIcon },
  { to: '/guide',         label: 'User Guide',    icon: BookOpenIcon },
  { to: '/profile',       label: 'Profile',       icon: UserCircleIcon },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-dark-900/95 border-r border-dark-800/60 flex flex-col z-30 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-dark-800/60">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-900/40">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">Sentinel</p>
          <p className="text-primary-400 text-xs font-medium">Health AI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center justify-between ${isActive ? 'nav-link-active' : 'nav-link'}`
            }
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </div>
            {badge && (
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-dark-800/60">
        <p className="text-xs text-dark-500">v1.0.0 — Module 4</p>
        <div className="flex gap-1 mt-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs text-dark-400">All systems operational</span>
        </div>
      </div>
    </aside>
  );
}
