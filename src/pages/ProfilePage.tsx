import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Globe, LogOut, CheckCircle2, Moon } from 'lucide-react';
import { repository } from '../data/index';
import { UserProfile } from '../core/types';
import { Card } from '../components/common/Card';
import { Avatar } from '../components/common/Avatar';
import { ThemeSelector } from '../components/common/ThemeToggle';

interface ProfilePageProps {
  onSignOut: () => Promise<void>;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onSignOut }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    repository.getCurrentUser().then(setCurrentUser);
  }, []);

  if (!currentUser) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mi Perfil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configuración de usuario y preferencias de la aplicación.</p>
      </div>

      {/* Tarjeta de Usuario */}
      <Card className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
        <Avatar name={currentUser.name} url={currentUser.avatarUrl} size="xl" />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentUser.name}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
          <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold rounded-full border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cuenta Verificada
            </span>
            <span className="text-xs px-2.5 py-1 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold rounded-full border border-brand-200 dark:border-brand-800/60">
              Usuario Activo
            </span>
          </div>
        </div>
      </Card>

      {/* Configuración y Preferencias */}
      <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0 overflow-hidden">
        {/* Modo Oscuro / Apariencia */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tema de la interfaz</p>
              <p className="text-xs text-slate-400">Elige entre modo claro, oscuro o sincronizado con el sistema</p>
            </div>
          </div>
          <ThemeSelector />
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Moneda predeterminada</p>
              <p className="text-xs text-slate-400">Euro (€) con precisión en céntimos enteros</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">EUR (€)</span>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Aplicación PWA</p>
              <p className="text-xs text-slate-400">Instalable en pantalla de inicio de iOS y Android</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
            Habilitado
          </span>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Seguridad & RLS</p>
              <p className="text-xs text-slate-400">Aislamiento por grupo y miembros autorizados</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-800/60">
            PostgreSQL RLS
          </span>
        </div>
      </Card>

      {/* Cerrar Sesión */}
      <div className="pt-2">
        <button
          onClick={() => { void onSignOut(); }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl text-sm font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
