import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { UserProfile } from '../../core/types';
import { Avatar } from '../common/Avatar';
import { NotificationsBell } from './NotificationsBell';
import { ThemeToggle } from '../common/ThemeToggle';

interface NavbarProps {
  currentUser: UserProfile;
  onOpenNewMovement: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onOpenNewMovement }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={`${import.meta.env.BASE_URL}pwa-192x192.png`}
            alt="EquiGasto Logo"
            className="w-9 h-9 rounded-xl shadow-sm object-cover border border-slate-100 dark:border-slate-800"
          />
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">EquiGasto</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 rounded-full border border-transparent dark:border-brand-800/40">
              PWA v0.1
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenNewMovement}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir gasto</span>
          </button>

          {/* Selector de modo oscuro */}
          <ThemeToggle />

          <NotificationsBell currentUserId={currentUser.id} />

          <Link to="/profile" className="flex items-center gap-2 pl-1 group">
            <Avatar name={currentUser.name} url={currentUser.avatarUrl} size="sm" />
            <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400">
              {currentUser.name}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};
