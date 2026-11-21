import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  User,
  Users,
  ChevronRight,
} from 'lucide-react';
import { repository } from '../data/index';
import { MovementImpact } from '../components/movements/MovementImpact';
import { PersonalExpensesWidget } from '../components/dashboard/PersonalExpensesWidget';
import { Group, Movement, UserProfile } from '../core/types';
import { formatCurrency } from '../core/money';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { MovementDetailModal } from '../components/movements/MovementDetailModal';
import { NewMovementModal } from '../components/movements/NewMovementModal';

export const DashboardPage: React.FC = () => {
  const { refreshTrigger, triggerRefresh } = useOutletContext<{ refreshTrigger: number; triggerRefresh: () => void }>();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, number>>({});
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);
  const [allMovements, setAllMovements] = useState<Movement[]>([]);
  const [overall, setOverall] = useState({ totalOwedCents: 0, totalOwesCents: 0, netCents: 0 });
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [movementToEdit, setMovementToEdit] = useState<Movement | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const user = await repository.getCurrentUser();
    const users = await repository.getUsers();
    const grps = await repository.getGroups();
    const movs = await repository.getMovements();
    const stats = await repository.getUserOverallBalance(user.id);

    // Balances individuales en cada grupo para el usuario actual
    const balancesMap: Record<string, number> = {};
    for (const g of grps) {
      if (g.members.length === 1) {
        const gMovs = movs.filter((m) => m.groupId === g.id);
        const inc = gMovs.filter((m) => m.type === 'INCOME').reduce((acc, m) => acc + m.amountCents, 0);
        const exp = gMovs.filter((m) => m.type !== 'INCOME').reduce((acc, m) => acc + m.amountCents, 0);
        balancesMap[g.id] = inc - exp;
      } else {
        const gBalances = await repository.getGroupBalances(g.id);
        const userB = gBalances.find((b) => b.userId === user.id);
        balancesMap[g.id] = userB ? userB.netBalanceCents : 0;
      }
    }

    setCurrentUser(user);
    setAllUsers(users);
    setGroups(grps);
    setAllMovements(movs);
    setRecentMovements(movs.slice(0, 5));
    setOverall(stats);
    setGroupBalances(balancesMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Saludo y Resumen Financiero */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hola, {currentUser.name.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-slate-500">Estado de tus cuentas y grupos.</p>
          </div>
        </div>

        {/* Resumen Compacto: 3 Columnas sin textos sobrantes */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Te deben */}
          <div className="p-2.5 sm:p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide block truncate">
              Te deben
            </span>
            <p className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
              {formatCurrency(overall.totalOwedCents)}
            </p>
          </div>

          {/* Debes */}
          <div className="p-2.5 sm:p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide block truncate">
              Debes
            </span>
            <p className="text-base sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 truncate">
              {formatCurrency(overall.totalOwesCents)}
            </p>
          </div>

          {/* Balance global */}
          <div className="p-2.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block truncate">
              Balance global
            </span>
            <p
              className={`text-base sm:text-2xl font-black mt-0.5 truncate ${
                overall.netCents > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : overall.netCents < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {formatCurrency(overall.netCents, { showSign: true })}
            </p>
          </div>
        </div>
      </div>

      {/* Mis Grupos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Mis Grupos</h2>
          </div>
          <Link
            to="/groups"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
          >
            Ver todos ({groups.length}) <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {groups.map((group) => {
            const balanceCents = groupBalances[group.id] || 0;
            const isIndividual = group.members.length === 1;

            return (
              <Link key={group.id} to={`/groups/${group.id}`}>
                <Card hoverable className="h-full p-3 sm:p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                          {group.icon}
                        </span>
                        {isIndividual && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Personal
                          </span>
                        )}
                      </div>
                      {!isIndividual && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {group.members.length} miembros
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-brand-600 truncate">
                      {group.name}
                    </h3>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mt-2">
                    <span className="text-slate-400 font-medium">
                      {isIndividual ? 'Balance:' : balanceCents > 0 ? 'Te deben:' : balanceCents < 0 ? 'Debes:' : 'Al día:'}
                    </span>
                    {isIndividual ? (
                      <span className={`font-bold ${balanceCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(balanceCents, { showSign: true })}
                      </span>
                    ) : (
                      <span
                        className={`font-bold ${
                          balanceCents > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : balanceCents < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {balanceCents === 0 ? '0,00 €' : formatCurrency(Math.abs(balanceCents))}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Cuadro de Gastos Personales (Uso individual) */}
      <PersonalExpensesWidget groups={groups} movements={allMovements} />

      {/* Actividad Reciente */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Actividad Reciente</h2>
          <Link
            to="/activity"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
          >
            Ver toda <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0 overflow-hidden">
          {recentMovements.length === 0 ? (
            <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
              No hay movimientos registrados todavía.
            </div>
          ) : (
            recentMovements.map((mov) => {
              const group = groups.find((g) => g.id === mov.groupId);

              return (
                <div
                  key={mov.id}
                  onClick={() => setSelectedMovement(mov)}
                  className="py-2.5 px-3.5 sm:py-3.5 sm:px-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-850 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                        {mov.concept}
                      </p>
                      <Badge type={mov.type} />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      <span className="truncate max-w-[120px] font-medium text-slate-600 dark:text-slate-300">
                        {group?.icon} {group?.name}
                      </span>
                      <span>·</span>
                      <span>{new Date(mov.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(mov.amountCents)}
                    </p>
                    <MovementImpact movement={mov} userId={currentUser?.id} />
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {/* Modal Detalle de Movimiento */}
      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          users={allUsers}
          group={groups.find((g) => g.id === selectedMovement.groupId)}
          onClose={() => setSelectedMovement(null)}
          onDeleted={() => {
            setSelectedMovement(null);
            triggerRefresh();
          }}
          onEdit={(mov) => {
            setMovementToEdit(mov);
          }}
        />
      )}

      {/* Modal Edición de Movimiento */}
      {movementToEdit && (
        <NewMovementModal
          groups={groups}
          currentUser={currentUser}
          initialGroupId={movementToEdit.groupId}
          movementToEdit={movementToEdit}
          onClose={() => setMovementToEdit(null)}
          onCreated={() => {
            setMovementToEdit(null);
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
};
