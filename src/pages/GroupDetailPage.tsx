import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Scale,
  Plus,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { repository } from '../data/mockRepository';
import { Group, Movement, UserProfile, MemberBalance, SimplifiedDebt } from '../core/types';
import { formatCurrency } from '../core/money';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { MovementDetailModal } from '../components/movements/MovementDetailModal';
import { NewMovementModal } from '../components/movements/NewMovementModal';

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { refreshTrigger, triggerRefresh } = useOutletContext<{ refreshTrigger: number; triggerRefresh: () => void }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebt[]>([]);
  
  const [activeTab, setActiveTab] = useState<'movements' | 'balances' | 'debts' | 'config'>('movements');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const grp = await repository.getGroupById(id);
    const user = await repository.getCurrentUser();
    const users = await repository.getUsers();
    const movs = await repository.getMovements(id);
    const bals = await repository.getGroupBalances(id);
    const debts = await repository.getGroupDebts(id);

    setGroup(grp || null);
    setCurrentUser(user);
    setAllUsers(users);
    setMovements(movs);
    setBalances(bals);
    setSimplifiedDebts(debts);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id, refreshTrigger]);

  if (loading || !group || !currentUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const filteredMovements = movements.filter((m) => {
    if (typeFilter === 'ALL') return true;
    return m.type === typeFilter;
  });

  const currentUserBalance = balances.find((b) => b.userId === currentUser.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Volver y Encabezado */}
      <div>
        <Link
          to="/groups"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Mis Grupos</span>
        </Link>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl p-3 bg-slate-50 rounded-2xl border border-slate-100">
                {group.icon}
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{group.name}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {group.description || 'Sin descripción'} • {group.members.length} miembros
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={() => setIsNewMovementModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir gasto</span>
              </button>
            </div>
          </div>

          {/* Banner de Saldo del Usuario en el Grupo */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-slate-500">
              Tu situación en este grupo:
            </span>
            <span
              className={`text-base sm:text-lg font-black ${
                (currentUserBalance?.netBalanceCents || 0) > 0
                  ? 'text-emerald-600'
                  : (currentUserBalance?.netBalanceCents || 0) < 0
                  ? 'text-rose-600'
                  : 'text-slate-600'
              }`}
            >
              {(currentUserBalance?.netBalanceCents || 0) > 0
                ? `Te deben ${formatCurrency(currentUserBalance?.netBalanceCents || 0)}`
                : (currentUserBalance?.netBalanceCents || 0) < 0
                ? `Debes ${formatCurrency(Math.abs(currentUserBalance?.netBalanceCents || 0))}`
                : 'Estás al día (0,00 €)'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto pb-1 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-2.5 px-1 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'movements'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Movimientos ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-2.5 px-1 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'balances'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Balances ({balances.length})
        </button>
        <button
          onClick={() => setActiveTab('debts')}
          className={`pb-2.5 px-1 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'debts'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Deudas Simplificadas ({simplifiedDebts.length})
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-2.5 px-1 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Configuración
        </button>
      </div>

      {/* TAB 1: MOVIMIENTOS */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Filtros rápidos */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            {['ALL', 'SHARED_EXPENSE', 'INDIVIDUAL_EXPENSE', 'LOAN', 'SETTLEMENT'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                  typeFilter === t
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t === 'ALL'
                  ? 'Todos'
                  : t === 'SHARED_EXPENSE'
                  ? 'Compartidos'
                  : t === 'INDIVIDUAL_EXPENSE'
                  ? 'Adelantos'
                  : t === 'LOAN'
                  ? 'Préstamos'
                  : 'Liquidaciones'}
              </button>
            ))}
          </div>

          <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
            {filteredMovements.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No hay movimientos con el filtro seleccionado.
              </div>
            ) : (
              filteredMovements.map((mov) => {
                const payer = allUsers.find((u) => u.id === mov.paidById);
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
                        isProvisional={payer?.isProvisional}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 truncate">{mov.concept}</p>
                          <Badge type={mov.type} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {isPayerMe ? 'Pagaste tú' : `Pagó ${payer?.name}`} •{' '}
                          {new Date(mov.date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right pl-3 shrink-0">
                      <p className="text-sm sm:text-base font-extrabold text-slate-900">
                        {formatCurrency(mov.amountCents)}
                      </p>
                      <span className="text-xs text-brand-600 font-medium">Ver detalle</span>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: BALANCES */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Cálculo determinista en céntimos: Total pagado vs. Total que correspondía asumir.
            La suma de todos los saldos netos es estrictamente cero (0,00 €).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {balances.map((b) => {
              const u = allUsers.find((user) => user.id === b.userId);
              const isPositive = b.netBalanceCents > 0;
              const isNegative = b.netBalanceCents < 0;

              return (
                <Card key={b.userId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={u?.name || 'Usuario'} url={u?.avatarUrl} size="md" isProvisional={u?.isProvisional} />
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {u?.name} {u?.id === currentUser.id ? '(Tú)' : ''}
                        </p>
                        <p className="text-xs text-slate-400">
                          {u?.isProvisional ? 'Participante provisional' : u?.email}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-base font-black px-2.5 py-1 rounded-xl ${
                        isPositive
                          ? 'bg-emerald-50 text-emerald-700'
                          : isNegative
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {formatCurrency(b.netBalanceCents, { showSign: true })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                    <div>
                      <span className="text-slate-400 block">Total pagado:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(b.paidCents)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Debería asumir:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(b.shouldPayCents)}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DEUDAS SIMPLIFICADAS */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3">
            <Scale className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <p className="text-xs text-brand-900">
              <span className="font-bold">Algoritmo de simplificación activo:</span> Minimiza el número de transferencias bancarias o Bizums requeridos sin alterar la posición neta de ningún participante.
            </p>
          </div>

          <div className="space-y-3">
            {simplifiedDebts.length === 0 ? (
              <Card className="text-center py-10">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-900">¡Todas las cuentas están saldadas!</p>
                <p className="text-xs text-slate-400">Nadie debe nada a nadie en este grupo.</p>
              </Card>
            ) : (
              simplifiedDebts.map((debt, idx) => {
                const fromUser = allUsers.find((u) => u.id === debt.fromUserId);
                const toUser = allUsers.find((u) => u.id === debt.toUserId);
                const isFromMe = debt.fromUserId === currentUser.id;
                const isToMe = debt.toUserId === currentUser.id;

                return (
                  <Card key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={fromUser?.name || 'U'} url={fromUser?.avatarUrl} size="sm" isProvisional={fromUser?.isProvisional} />
                      <span className="font-bold text-slate-800 text-sm">
                        {fromUser?.name} {isFromMe ? '(Tú)' : ''}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">debe pagar a</span>
                      <Avatar name={toUser?.name || 'U'} url={toUser?.avatarUrl} size="sm" isProvisional={toUser?.isProvisional} />
                      <span className="font-bold text-slate-800 text-sm">
                        {toUser?.name} {isToMe ? '(Tú)' : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className="text-base font-extrabold text-slate-900">
                        {formatCurrency(debt.amountCents)}
                      </span>
                      <button
                        onClick={() => setIsNewMovementModalOpen(true)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
                      >
                        Liquidar
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURACIÓN */}
      {activeTab === 'config' && (
        <Card className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Modalidad de reparto predeterminada</h3>
            <p className="text-xs text-slate-500 mb-3">
              Los nuevos gastos compartidos adoptarán esta configuración por defecto. Los gastos históricos conservan siempre la suya.
            </p>
            <div className="inline-block px-3 py-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold rounded-xl">
              {group.defaultSplitMode === 'EQUAL' ? 'Partes Iguales' : 'Porcentajes Personalizados'}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-2">Miembros y configuración porcentual</h4>
            <div className="space-y-2">
              {group.members.map((m) => {
                const u = allUsers.find((user) => user.id === m.userId);
                return (
                  <div key={m.userId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u?.name || 'U'} url={u?.avatarUrl} size="sm" isProvisional={u?.isProvisional} />
                      <div>
                        <p className="font-bold text-slate-800">{u?.name}</p>
                        <p className="text-slate-400">{m.role === 'ADMIN' ? 'Administrador' : 'Miembro'}</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {m.percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Modales */}
      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          users={allUsers}
          group={group}
          onClose={() => setSelectedMovement(null)}
          onDeleted={loadData}
        />
      )}

      {isNewMovementModalOpen && (
        <NewMovementModal
          groups={[group]}
          currentUser={currentUser}
          initialGroupId={group.id}
          onClose={() => setIsNewMovementModalOpen(false)}
          onCreated={() => {
            setIsNewMovementModalOpen(false);
            loadData();
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
};
