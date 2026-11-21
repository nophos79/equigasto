import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
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
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [movementToEdit, setMovementToEdit] = useState<Movement | null>(null);
  interface UserConsolidatedDebt {
  userId: string;
  userName: string;
  amountCents: number;
}

  const [peopleWhoOweMe, setPeopleWhoOweMe] = useState<UserConsolidatedDebt[]>([]);
  const [peopleIOwe, setPeopleIOwe] = useState<UserConsolidatedDebt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const user = await repository.getCurrentUser();
    const users = await repository.getUsers();
    const grps = await repository.getGroups();
    const movs = await repository.getMovements();

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
    // Balances acumulados por persona en todos los grupos
    const userNetMap: Record<string, { name: string; netCents: number }> = {};
    for (const g of grps) {
      if (g.members.length > 1) {
        try {
          const debts = await repository.getGroupDebts(g.id);
          for (const d of debts) {
            if (d.toUserId === user.id) {
              if (!userNetMap[d.fromUserId]) {
                const other = users.find((u) => u.id === d.fromUserId);
                userNetMap[d.fromUserId] = { name: other?.name || 'Compañero', netCents: 0 };
              }
              userNetMap[d.fromUserId].netCents += d.amountCents;
            } else if (d.fromUserId === user.id) {
              if (!userNetMap[d.toUserId]) {
                const other = users.find((u) => u.id === d.toUserId);
                userNetMap[d.toUserId] = { name: other?.name || 'Compañero', netCents: 0 };
              }
              userNetMap[d.toUserId].netCents -= d.amountCents;
            }
          }
        } catch (e) {}
      }
    }

    const whoOwes: UserConsolidatedDebt[] = [];
    const whoIOweList: UserConsolidatedDebt[] = [];
    for (const [otherId, item] of Object.entries(userNetMap)) {
      if (item.netCents > 0) {
        whoOwes.push({
          userId: otherId,
          userName: item.name,
          amountCents: item.netCents,
        });
      } else if (item.netCents < 0) {
        whoIOweList.push({
          userId: otherId,
          userName: item.name,
          amountCents: Math.abs(item.netCents),
        });
      }
    }
    whoOwes.sort((a, b) => b.amountCents - a.amountCents);
    whoIOweList.sort((a, b) => b.amountCents - a.amountCents);

    setPeopleWhoOweMe(whoOwes);
    setPeopleIOwe(whoIOweList);

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
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Saludo y Resumen Financiero */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Hola, {currentUser.name.split(' ')[0]} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Estado de tus cuentas y grupos.</p>
          </div>
        </div>

        {/* Balances Acumulados por Persona: Cuadro Verde y Cuadro Rojo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Cuadro Verde: Personas que te deben */}
          <div className="p-3.5 sm:p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs">
            {peopleWhoOweMe.length === 0 ? (
              <p className="text-sm font-semibold text-emerald-800/80 dark:text-emerald-300/80 text-center py-2">
                Nadie te debe dinero
              </p>
            ) : (
              <div className="space-y-2">
                {peopleWhoOweMe.map((p) => (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between text-sm sm:text-base py-1 border-b border-emerald-100/70 dark:border-emerald-900/30 last:border-0"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate mr-2">
                      <strong className="text-slate-900 dark:text-white font-bold">{p.userName}</strong> te debe
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                      {formatCurrency(p.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cuadro Rojo: Personas a las que debes */}
          <div className="p-3.5 sm:p-4 bg-rose-50/80 dark:bg-rose-950/40 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-xs">
            {peopleIOwe.length === 0 ? (
              <p className="text-sm font-semibold text-rose-800/80 dark:text-rose-300/80 text-center py-2">
                No debes nada
              </p>
            ) : (
              <div className="space-y-2">
                {peopleIOwe.map((p) => (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between text-sm sm:text-base py-1 border-b border-rose-100/70 dark:border-rose-900/30 last:border-0"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate mr-2">
                      Debes a <strong className="text-slate-900 dark:text-white font-bold">{p.userName}</strong>
                    </span>
                    <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 shrink-0">
                      {formatCurrency(p.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
              <Link key={group.id} to={`/groups/${group.id}`} className="group block">
                <Card hoverable className="p-3 sm:p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-2xl p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
                        {group.icon}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-brand-600 truncate min-w-0">
                        {group.name}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {isIndividual ? 'Personal' : `${group.members.length} miembros`}
                    </span>
                  </div>

                  <div
                    className={`mt-2.5 p-2 rounded-xl flex items-center justify-between border ${
                      isIndividual
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50'
                        : balanceCents > 0
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50'
                        : balanceCents < 0
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <span
                      className={`text-sm font-bold ${
                        isIndividual
                          ? 'text-indigo-800 dark:text-indigo-300'
                          : balanceCents > 0
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : balanceCents < 0
                          ? 'text-rose-800 dark:text-rose-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isIndividual
                        ? 'Balance'
                        : balanceCents > 0
                        ? 'Te deben'
                        : balanceCents < 0
                        ? 'Debes'
                        : 'Al día'}
                    </span>
                    <span
                      className={`text-base sm:text-lg font-black ${
                        isIndividual
                          ? balanceCents >= 0
                            ? 'text-indigo-900 dark:text-indigo-300'
                            : 'text-rose-700 dark:text-rose-400'
                          : balanceCents > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : balanceCents < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isIndividual
                        ? formatCurrency(balanceCents, { showSign: true })
                        : balanceCents === 0
                        ? '0,00 €'
                        : (balanceCents > 0 ? '+' : '-') + formatCurrency(Math.abs(balanceCents))}
                    </span>
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
              const isSingleGroup = group?.members.length === 1;
              const payer = allUsers.find((u) => u.id === mov.paidById);
              const payerName = payer?.name.split(' ')[0] || currentUser.name.split(' ')[0] || 'Compañero';
              const movDate = new Date(mov.date);
              const monthStr = movDate.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
              const dayStr = movDate.getDate();

              return (
                <div
                  key={mov.id}
                  onClick={() => setSelectedMovement(mov)}
                  className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-850 cursor-pointer transition-colors"
                >
                  {/* Fecha como primer dato en formato visible */}
                  <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0 leading-none border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-400 mb-0.5">
                      {monthStr}
                    </span>
                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {dayStr}
                    </span>
                  </div>

                  {/* Detalle del movimiento */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
                        {mov.concept}
                      </p>
                      <Badge type={mov.type} isIndividual={isSingleGroup} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="truncate max-w-[130px] font-medium text-slate-600 dark:text-slate-300">
                        {group?.icon} {group?.name}
                      </span>
                      <span>·</span>
                      <span>Pagó <strong className="font-semibold text-slate-700 dark:text-slate-300">{payerName}</strong></span>
                    </div>
                  </div>

                  {/* Importe e impacto económico */}
                  <div className="text-right shrink-0">
                    <p className={`text-base sm:text-lg font-black ${
                      isSingleGroup && mov.type === 'INCOME'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      {isSingleGroup && mov.type === 'INCOME' ? `+${formatCurrency(mov.amountCents)}` : formatCurrency(mov.amountCents)}
                    </p>
                    {!isSingleGroup && (
                      <MovementImpact movement={mov} userId={currentUser?.id} isSingleMemberGroup={isSingleGroup} />
                    )}
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
