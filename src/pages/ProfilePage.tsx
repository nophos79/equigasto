import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Globe, LogOut, CheckCircle2, Moon, UserCheck, UserX, Clock, ShieldAlert, Loader2 } from 'lucide-react';
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
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    repository.getCurrentUser().then((user) => {
      setCurrentUser(user);
      if (user.isAdmin) {
        loadPendingUsers();
      }
    });
  }, []);

  const loadPendingUsers = async () => {
    setLoadingPending(true);
    try {
      const list = await repository.getPendingUsers();
      setPendingUsers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApprove = async (user: UserProfile) => {
    setActionLoadingId(user.id);
    setFeedback(null);
    try {
      await repository.approveUser(user.id);
      setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
      setFeedback({ type: 'success', message: `¡Cuenta de ${user.name} aprobada con éxito!` });
    } catch (e) {
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo aprobar la cuenta' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (user: UserProfile) => {
    if (!window.confirm(`¿Seguro que deseas rechazar y eliminar la solicitud de ${user.name}?`)) {
      return;
    }
    setActionLoadingId(user.id);
    setFeedback(null);
    try {
      await repository.rejectUser(user.id);
      setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
      setFeedback({ type: 'success', message: `Solicitud de ${user.name} rechazada.` });
    } catch (e) {
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo rechazar la cuenta' });
    } finally {
      setActionLoadingId(null);
    }
  };

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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentUser.name}</h2>
            {currentUser.isAdmin && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-800/80 self-center sm:self-auto">
                <Shield className="w-3 h-3" /> Administrador
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
          <div className="mt-3 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold rounded-full border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cuenta Verificada
            </span>
            <span className="text-xs px-2.5 py-1 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold rounded-full border border-brand-200 dark:border-brand-800/60">
              Usuario Activo
            </span>
          </div>
        </div>
      </Card>

      {/* Panel de Administrador: Solicitudes pendientes */}
      {currentUser.isAdmin && (
        <Card className="space-y-4 border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/20 to-transparent dark:from-amber-950/10">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Solicitudes de acceso pendientes</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Valida qué usuarios pueden usar la app tras registrarse
                </p>
              </div>
            </div>
            {pendingUsers.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 bg-amber-500 text-white rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {loadingPending ? (
            <div className="py-6 flex items-center justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-600" />
              <span className="text-xs">Cargando solicitudes...</span>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="py-6 text-center text-slate-400 dark:text-slate-500 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No hay solicitudes pendientes</p>
              <p className="text-[11px]">Todos los usuarios registrados han sido validados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((pending) => (
                <div
                  key={pending.id}
                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={pending.name} url={pending.avatarUrl} size="md" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{pending.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{pending.email}</p>
                      {pending.createdAt && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(pending.createdAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleReject(pending)}
                      disabled={actionLoadingId === pending.id}
                      className="px-3 py-1.5 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                      title="Rechazar solicitud"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Rechazar</span>
                    </button>
                    <button
                      onClick={() => handleApprove(pending)}
                      disabled={actionLoadingId === pending.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1 disabled:opacity-50"
                      title="Aprobar acceso a la app"
                    >
                      {actionLoadingId === pending.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Aprobar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

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
              <p className="text-xs text-slate-400">Aislamiento por grupo y validación por administrador</p>
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
