import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { repository } from '../../data/index';
import { Movement, Group, UserProfile } from '../../core/types';
import { formatCurrency } from '../../core/money';
import { calculateMovementImpact } from '../../core/balance';
import { useRealtime } from '../../hooks/useRealtime';

interface NotificationsBellProps {
  currentUserId: string;
}

const MAX_ITEMS = 8;
const storageKey = (uid: string) => 'notifications-last-seen-' + uid;

export const NotificationsBell: React.FC<NotificationsBellProps> = ({ currentUserId }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [lastSeen, setLastSeen] = useState<string>(() => {
    const stored = localStorage.getItem(storageKey(currentUserId));
    if (stored) return stored;
    const now = new Date().toISOString();
    localStorage.setItem(storageKey(currentUserId), now);
    return now;
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

  const isUnread = (m: Movement) =>
    m.createdAt > lastSeen &&
    m.paidById !== currentUserId &&
    calculateMovementImpact(m, currentUserId) !== 0;

  const unreadCount = movements.filter(isUnread).length;

  const closeAndMarkSeen = () => {
    const now = new Date().toISOString();
    localStorage.setItem(storageKey(currentUserId), now);
    setLastSeen(now);
    setOpen(false);
  };

  const handleToggle = () => (open ? closeAndMarkSeen() : setOpen(true));

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
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeAndMarkSeen} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Actividad reciente</p>
            </div>

            {movements.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">No hay actividad todavía.</p>
            ) : (
              <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {movements.map((m) => {
                  const payer = users.find((u) => u.id === m.paidById);
                  const group = groups.find((g) => g.id === m.groupId);
                  const net = calculateMovementImpact(m, currentUserId);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          closeAndMarkSeen();
                          navigate('/groups/' + m.groupId);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors ${
                          isUnread(m) ? 'bg-brand-50/60 dark:bg-brand-950/40' : ''
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{m.concept}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {group?.icon} {group?.name} · {m.paidById === currentUserId ? 'Pagaste tú' : 'Pagó ' + (payer?.name ?? 'alguien')} ·{' '}
                          {formatCurrency(m.amountCents)}
                        </p>
                        {net !== 0 && (
                          <p className={`text-xs font-semibold mt-0.5 ${net > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {net > 0 ? 'Te deben ' + formatCurrency(net) : 'Debes ' + formatCurrency(-net)}
                          </p>
                        )}
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
