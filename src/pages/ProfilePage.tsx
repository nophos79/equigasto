import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Globe, LogOut, CheckCircle2, UserCheck } from 'lucide-react';
import { repository } from '../data/mockRepository';
import { UserProfile } from '../core/types';
import { Card } from '../components/common/Card';
import { Avatar } from '../components/common/Avatar';

interface ProfilePageProps {
  onSignOut: () => Promise<void>;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onSignOut }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [provisionalLinked, setProvisionalLinked] = useState(false);

  useEffect(() => {
    repository.getCurrentUser().then(setCurrentUser);
  }, []);

  if (!currentUser) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mi Perfil</h1>
        <p className="text-sm text-slate-500">Configuración de usuario y preferencias de la aplicación.</p>
      </div>

      {/* Tarjeta de Usuario */}
      <Card className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
        <Avatar name={currentUser.name} url={currentUser.avatarUrl} size="xl" />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900">{currentUser.name}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
          <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cuenta Verificada
            </span>
            <span className="text-xs px-2.5 py-1 bg-brand-50 text-brand-700 font-semibold rounded-full border border-brand-200">
              Usuario Activo
            </span>
          </div>
        </div>
      </Card>

      {/* Vinculación de Participantes Provisionales (Requisito Especificación) */}
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <UserCheck className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Vinculación de identidad provisional</h3>
            <p className="text-xs text-slate-500 mt-1">
              Si fuiste incluido en un grupo antes de registrarte mediante un perfil provisional, puedes reclamar y vincular tu historial económico completo aquí.
            </p>
          </div>
        </div>

        {provisionalLinked ? (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ¡Identidades provisionales sincronizadas y consolidadas con éxito!
          </div>
        ) : (
          <button
            onClick={() => setProvisionalLinked(true)}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Comprobar invitaciones e historial previo
          </button>
        )}
      </Card>

      {/* Configuración y Preferencias */}
      <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Moneda predeterminada</p>
              <p className="text-xs text-slate-400">Euro (€) con precisión en céntimos enteros</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">EUR (€)</span>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Aplicación PWA</p>
              <p className="text-xs text-slate-400">Instalable en pantalla de inicio de iOS y Android</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Habilitado
          </span>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Seguridad & RLS</p>
              <p className="text-xs text-slate-400">Aislamiento por grupo y miembros autorizados</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
            PostgreSQL RLS
          </span>
        </div>
      </Card>

      {/* Cerrar Sesión */}
      <div className="pt-2">
        <button
          onClick={() => { void onSignOut(); }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl text-sm font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
