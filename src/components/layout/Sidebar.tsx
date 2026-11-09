import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, User, PlusCircle, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../../core/types';
import { Avatar } from '../common/Avatar';
import { ThemeToggle } from '../common/ThemeToggle';

interface SidebarProps {
  currentUser: UserProfile;
  onOpenNewMovement: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, onOpenNewMovement }) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/groups', label: 'Mis Grupos', icon: Users },
    { to: '/activity', label: 'Actividad', icon: Activity },
    { to: '/profile', label: 'Mi Perfil', icon: User },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen sticky top-0 p-5 justify-between transition-colors">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-1 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-brand-500/20">
            €
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">EquiGasto</h1>
            <p className="text-xs text-slate-400 dark:text-slate-400">Control de deudas y gastos</p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onOpenNewMovement}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm shadow-sm shadow-brand-500/20 transition-all active:scale-[0.98] mb-6"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Nuevo Movimiento</span>
        </button>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / User info & Theme */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Tema
          </span>
          <ThemeToggle showLabel />
        </div>

        <div className="flex items-center gap-3 px-2">
          <Avatar name={currentUser.name} url={currentUser.avatarUrl} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{currentUser.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 text-xs text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Seguridad RLS Supabase</span>
        </div>
      </div>
    </aside>
  );
};
