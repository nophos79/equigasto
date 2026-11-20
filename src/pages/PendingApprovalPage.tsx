import React, { useState } from 'react';
import { Clock, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../core/types';
import { Card } from '../components/common/Card';
import { Avatar } from '../components/common/Avatar';

interface PendingApprovalPageProps {
  currentUser: UserProfile;
  onCheckStatus: () => void;
  onSignOut: () => Promise<void>;
}

export const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({
  currentUser,
  onCheckStatus,
  onSignOut,
}) => {
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await onCheckStatus();
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 transition-colors">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mb-2 shadow-sm border border-amber-200 dark:border-amber-900/50">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Cuenta pendiente de aprobación
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hola <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser.name}</span>, tu cuenta se ha registrado correctamente pero requiere la validación de un administrador.
          </p>
        </div>

        {/* Card info */}
        <Card className="p-5 border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={currentUser.name} url={currentUser.avatarUrl} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800/60">
              Pendiente
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Para proteger los datos del grupo y mantener la privacidad, el administrador debe aprobar tu acceso antes de que puedas ver o registrar gastos.
            </span>
          </div>
        </Card>

        {/* Botones de acción */}
        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white rounded-2xl text-sm font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Comprobando acceso...' : 'Comprobar si ya me han aprobado'}</span>
          </button>

          <button
            onClick={() => { void onSignOut(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          ¿Conoces al administrador? Avísale por WhatsApp o correo para que active tu cuenta al instante.
        </p>
      </div>
    </div>
  );
};
