import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  User,
  TrendingUp,
  TrendingDown,
  Scale,
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
import { Avatar } from '../components/common/Avatar';
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
      const gBalances = await repository.getGroupBalances(g.id);
      const userB = gBalances.find((b) => b.userId === user.id);
      balancesMap[g.id] = userB ? userB.netBalanceCents : 0;
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hola, {currentUser.name.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-slate-500">Aquí tienes el estado actual de tus cuentas y grupos.</p>
          </div>
        </div>

        {/* Balance Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
          {/* Te deben */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Te deben en total
              </span>
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
              {formatCurrency(overall.totalOwedCents)}
            </p>
            <p className="text-xs text-emerald-600/90 mt-1 font-medium">Pendiente de cobro</p>
          </Card>

          {/* Debes */}
          <Card className="bg-gradient-to-br from-rose-500/10 to-orange-500/5 border-rose-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
                Debes en total
              </span>
              <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-2">
              {formatCurrency(overall.totalOwesCents)}
            </p>
            <p className="text-xs text-rose-600/90 mt-1 font-medium">Pendiente de liquidar</p>
          </Card>

          {/* Balance Neto */}
          <Card
            className={`border ${
              overall.netCents >= 0
                ? 'bg-gradient-to-br from-indigo-500/10 to-brand-500/5 border-indigo-100'
                : 'bg-gradient-to-br from-slate-100 to-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Balance global neto
              </span>
              <div className="p-2 bg-indigo-100 text-brand-700 rounded-xl">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <p
              className={`text-2xl sm:text-3xl font-black mt-2 ${
                overall.netCents > 0
                  ? 'text-emerald-600'
                  : overall.netCents < 0
                  ? 'text-rose-600'
                  : 'text-slate-700'
              }`}
            >
              {formatCurrency(overall.netCents, { showSign: true })}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {overall.netCents >= 0 ? 'Posición general positiva' : 'Debes más de lo que te deben'}
            </p>
          </Card>
        </div>
      </div>

      {/* Cuadro de Gastos Personales (Uso individual) */}
      <PersonalExpensesWidget groups={groups} movements={allMovements} />

      {/* Grupos Activos */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Mis Grupos Activos</h2>
          </div>
          <Link
            to="/groups"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
          >
            Ver todos ({groups.length}) <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {groups.map((group) => {
            const balanceCents = groupBalances[group.id] || 0;
            const isIndividual = group.members.length === 1;

            return (
              <Link key={group.id} to={`/groups/${group.id}`}>
                <Card hoverable className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shadow-inner">
                        {group.icon}
                      </div>
                      {isIndividual ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Personal
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {group.members.length} miembros
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-brand-600">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mb-3">{group.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
                    <span className="text-slate-400">
                      {isIndividual ? 'Tipo:' : 'Tu balance:'}
                    </span>
                    {isIndividual ? (
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                        Uso personal
                      </span>
                    ) : (
                      <span
                        className={`font-bold ${
                          balanceCents > 0
                            ? 'text-emerald-600'
                            : balanceCents < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {formatCurrency(balanceCents, { showSign: true })}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Actividad Reciente */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-lg font-bold text-slate-900">Actividad Reciente</h2>
          <Link
            to="/activity"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
          >
            Ver toda <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
          {recentMovements.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No hay movimientos registrados todavía.
            </div>
          ) : (
            recentMovements.map((mov) => {
              const payer = allUsers.find((u) => u.id === mov.paidById);
              const group = groups.find((g) => g.id === mov.groupId);
              const isPayerMe = mov.paidById === currentUser.id;

              return (
                <div
                  key={mov.id}
                  onClick={() => setSelectedMovement(mov)}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      name={payer?.name || 'Usuario'}
                      url={payer?.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 truncate">{mov.concept}</p>
                        <Badge type={mov.type} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>{group?.icon} {group?.name}</span>
                        <span>•</span>
                        <span>{isPayerMe ? 'Pagaste tú' : `Pagó ${payer?.name}`}</span>
                        <span>•</span>
                        <span>{new Date(mov.date).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right pl-3 shrink-0">
                    <p className="text-sm sm:text-base font-extrabold text-slate-900">
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
