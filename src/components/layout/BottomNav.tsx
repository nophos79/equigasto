import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, User, Plus } from 'lucide-react';

interface BottomNavProps {
  onOpenNewMovement: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenNewMovement }) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 pb-safe">
      <nav className="flex items-center justify-around h-16 max-w-md mx-auto relative">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Inicio</span>
        </NavLink>

        <NavLink
          to="/groups"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Grupos</span>
        </NavLink>

        {/* Central Prominent Plus Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={onOpenNewMovement}
            aria-label="Registrar nuevo movimiento"
            className="w-13 h-13 w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/40 active:scale-95 transition-transform border-4 border-white"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        <NavLink
          to="/activity"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span>Actividad</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Perfil</span>
        </NavLink>
      </nav>
    </div>
  );
};
