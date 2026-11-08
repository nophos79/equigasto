import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Bell } from 'lucide-react';
import { UserProfile } from '../../core/types';
import { Avatar } from '../common/Avatar';

interface NavbarProps {
  currentUser: UserProfile;
  onOpenNewMovement: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onOpenNewMovement }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-brand-500/30">
            €
          </div>
          <div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">EquiGasto</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">
              PWA v0.1
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewMovement}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir gasto</span>
          </button>

          <button
            type="button"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors relative"
            title="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-600 rounded-full" />
          </button>

          <Link to="/profile" className="flex items-center gap-2 pl-1 group">
            <Avatar name={currentUser.name} url={currentUser.avatarUrl} size="sm" />
            <span className="hidden md:block text-sm font-medium text-slate-700 group-hover:text-brand-600">
              {currentUser.name}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};
