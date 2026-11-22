import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCheck } from 'lucide-react';
import { repository } from '../../data/index';
import { Movement, Group, UserProfile } from '../../core/types';
import { formatCurrency } from '../../core/money';
import { calculateMovementImpact } from '../../core/balance';
import { useRealtime } from '../../hooks/useRealtime';

interface NotificationsBellProps {
  currentUserId: string;
}

const MAX_ITEMS = 12;
const lastSeenStorageKey = (uid: string) => 'notifications-last-seen-' + uid;
const dismissedStorageKey = (uid: string) => 'notifications-dismissed-' + uid;

export const NotificationsBell: React.FC<NotificationsBellProps> = ({ currentUserId }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [lastSeen, setLastSeen] = useState<string>(() => {
    const stored = localStorage.getItem(lastSeenStorageKey(currentUserId));
    if (stored) return stored;
    const now = new Date().toISOString();
    localStorage.setItem(lastSeenStorageKey(currentUserId), now);
    return now;
  });
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(dismissedStorageKey(currentUserId));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const load = useCallback(async () => {
    try {
      const [m, g, u] = await Promise.all([
        repository.getMovements(),
        repository.getGroups(),
        repository.getUsers(),
      ]);
      setMovements([...m].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_ITEMS));
      setGroups(g);
      setUsers(u);
    } catch {
      // La campana nunca debe romper la aplicación
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime('notifications-' + currentUserId, [{ table: 'movements' }], load);

  // Notificaciones no descartadas
  const activeNotifications = movements.filter((m) => !dismissedIds.includes(m.id));

  // Contador de no leídas (no descartadas, posteriores a la última apertura y que afectan al usuario)
  const isUnread = (m: Movement) =>
    !dismissedIds.includes(m.id) &&
    m.createdAt > lastSeen &&
    m.paidById !== currentUserId &&
    calculateMovementImpact(m, currentUserId) !== 0;

  const unreadCount = movements.filter(isUnread).length;

  const closeAndMarkSeen = () => {
    const now = new Date().toISOString();
    localStorage.setItem(lastSeenStorageKey(currentUserId), now);
    setLastSeen(now);
    setOpen(false);
  };

  const handleToggle = () => (open ? closeAndMarkSeen() : setOpen(true));

  const handleDismissOne = (e: React.MouseEvent, movId: string) => {
    e.stopPropagation();
    const next = [...dismissedIds, movId];
    setDismissedIds(next);
    try {
      localStorage.setItem(dismissedStorageKey(currentUserId), JSON.stringify(next));
    } catch {}
  };

  const handleDismissAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = movements.map((m) => m.id);
    const next = Array.from(new Set([...dismissedIds, ...allIds]));
    setDismissedIds(next);
    try {
      localStorage.setItem(dismissedStorageKey(currentUserId), JSON.stringify(next));
    } catch {}
    closeAndMarkSeen();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors relative"
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeAndMarkSeen} />
          <div className="fixed left-3 right-3 top-16 sm:top-full sm:left-auto sm:right-0 sm:absolute mt-2 sm:w-96 max-w-sm mx-auto sm:mx-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Notificaciones</p>
                {activeNotifications.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {activeNotifications.length}
                  </span>
                )}
              </div>
              {activeNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleDismissAll}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Limpiar todo</span>
                </button>
              )}
            </div>

            {/* Lista de Notificaciones */}
            {activeNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 font-bold text-sm">
                  ✓
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">¡Estás al día!</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  No tienes notificaciones pendientes.
                </p>
              </div>
            ) : (
              <ul className="max-h-[65vh] sm:max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {activeNotifications.map((m) => {
                  const payer = users.find((u) => u.id === m.paidById);
                  const group = groups.find((g) => g.id === m.groupId);
                  const net = calculateMovementImpact(m, currentUserId);
                  return (
                    <li key={m.id} className="relative group/item">
                      <button
                        type="button"
                        onClick={() => {
                          closeAndMarkSeen();
                          navigate('/groups/' + m.groupId);
                        }}
                        className={`w-full text-left px-4 py-3 pr-10 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors ${
                          isUnread(m) ? 'bg-brand-50/60 dark:bg-brand-950/40' : ''
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words pr-2">
                          {m.concept}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">
                          {group?.icon} {group?.name} · {m.paidById === currentUserId ? 'Pagaste tú' : 'Pagó ' + (payer?.name ?? 'alguien')} ·{' '}
                          {formatCurrency(m.amountCents)}
                        </p>
                        {net !== 0 && (
                          <p className={`text-xs font-semibold mt-0.5 ${net > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {net > 0 ? 'Te deben ' + formatCurrency(net) : 'Debes ' + formatCurrency(-net)}
                          </p>
                        )}
                      </button>

                      {/* Botón descartar notificación individual */}
                      <button
                        type="button"
                        onClick={(e) => handleDismissOne(e, m.id)}
                        title="Descartar notificación"
                        aria-label="Descartar notificación"
                        className="absolute right-2.5 top-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors opacity-70 group-hover/item:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
