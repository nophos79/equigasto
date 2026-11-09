import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Scale,
  Plus,
  Filter,
  CheckCircle2,
  UserPlus,
  Save,
  Percent,
} from 'lucide-react';
import { repository } from '../data/mockRepository';
import { useRealtime } from '../hooks/useRealtime';
import { Group, Movement, UserProfile, MemberBalance, SimplifiedDebt, SplitMode } from '../core/types';
import { formatCurrency } from '../core/money';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { MovementDetailModal } from '../components/movements/MovementDetailModal';
import { NewMovementModal } from '../components/movements/NewMovementModal';

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshTrigger, triggerRefresh } = useOutletContext<{ refreshTrigger: number; triggerRefresh: () => void }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebt[]>([]);
  
  const [activeTab, setActiveTab] = useState<'movements' | 'balances' | 'debts' | 'settlements' | 'config'>('movements');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [memberFilter, setMemberFilter] = useState<string>('ALL');
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [movementToEdit, setMovementToEdit] = useState<Movement | null>(null);

  // Estados para modal de movimiento
  const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState(false);
  const [prefillSettlement, setPrefillSettlement] = useState<{
    paidById: string;
    recipientId: string;
    amountCents: number;
  } | null>(null);

  // Estados de Configuración de Grupo
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editSplitMode, setEditSplitMode] = useState<SplitMode>('EQUAL');
  const [memberPercentages, setMemberPercentages] = useState<Record<string, number>>({});
  const [newMemberName, setNewMemberName] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState('');

  const [loading, setLoading] = useState(true);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  const handleDeleteGroup = async () => {
    if (!group) return;
    const ok = window.confirm(
      '¿Eliminar el grupo "' + group.name + '"? Se borrarán también todos sus movimientos. Esta acción no se puede deshacer.'
    );
    if (!ok) return;
    setIsDeletingGroup(true);
    try {
      await repository.deleteGroup(group.id);
      triggerRefresh();
      navigate('/groups');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar el grupo');
      setIsDeletingGroup(false);
    }
  };

  const loadData = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
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

    if (grp && !silent) {
      setEditGroupName(grp.name);
      setEditGroupDesc(grp.description || '');
      setEditSplitMode(grp.defaultSplitMode);
      const pMap: Record<string, number> = {};
      grp.members.forEach((m) => {
        pMap[m.userId] = m.percentage;
      });
      setMemberPercentages(pMap);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id, refreshTrigger]);

  // Tiempo real: refresco silencioso cuando alguien cambia datos de este grupo
  useRealtime(
    'group-' + (id ?? ''),
    [
      { table: 'movements', filter: id ? 'group_id=eq.' + id : undefined },
      { table: 'movement_shares' },
      { table: 'group_members', filter: id ? 'group_id=eq.' + id : undefined },
    ],
    () => loadData(true),
  );

  if (loading || !group || !currentUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // Filtrado de movimientos
  const filteredMovements = movements.filter((m) => {
    if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
    if (memberFilter !== 'ALL') {
      const isPayer = m.paidById === memberFilter;
      const isRecipient = m.recipientId === memberFilter;
      const isShareMember = m.shares.some((s) => s.userId === memberFilter);
      if (!isPayer && !isRecipient && !isShareMember) return false;
    }
    return true;
  });

  const settlementMovements = movements.filter((m) => m.type === 'SETTLEMENT');
  const currentUserBalance = balances.find((b) => b.userId === currentUser.id);

  // Validación de porcentajes en configuración
  const totalPercentageSum = Object.values(memberPercentages).reduce((acc, v) => acc + (v || 0), 0);
  const isPercentageValid = Math.abs(totalPercentageSum - 100) < 0.05;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroupName.trim()) return;

    if (editSplitMode === 'PERCENTAGE' && !isPercentageValid) {
      alert(`La suma de los porcentajes debe ser exactamente 100% (actualmente: ${totalPercentageSum.toFixed(2)}%)`);
      return;
    }

    setIsSavingConfig(true);
    try {
      const updatedMembers = group.members.map((m) => ({
        ...m,
        percentage: memberPercentages[m.userId] ?? m.percentage,
      }));

      await repository.updateGroup(group.id, {
        name: editGroupName.trim(),
        description: editGroupDesc.trim() || undefined,
        defaultSplitMode: editSplitMode,
        members: updatedMembers,
      });

      setConfigSuccessMsg('Configuración guardada correctamente');
      setTimeout(() => setConfigSuccessMsg(''), 3000);
      triggerRefresh();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la configuración');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleAddProvisionalMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    try {
      await repository.addMemberByEmail(group.id, newMemberName.trim());
      setNewMemberName('');
      triggerRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al añadir al miembro');
    }
  };

  const handleOpenSettlement = (debt: SimplifiedDebt) => {
    setPrefillSettlement({
      paidById: debt.fromUserId,
      recipientId: debt.toUserId,
      amountCents: debt.amountCents,
    });
    setIsNewMovementModalOpen(true);
  };

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
                onClick={() => {
                  setPrefillSettlement(null);
                  setMovementToEdit(null);
                  setIsNewMovementModalOpen(true);
                }}
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
              Tu situación económica en este grupo:
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
          Balances ({balances.filter((b) => b.paidCents !== 0 || b.shouldPayCents !== 0).length})
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
          onClick={() => setActiveTab('settlements')}
          className={`pb-2.5 px-1 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'settlements'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Liquidaciones ({settlementMovements.length})
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
          {/* Filtros avanzados */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Tipo:
              </span>
              {['ALL', 'SHARED_EXPENSE', 'INDIVIDUAL_EXPENSE', 'LOAN', 'SETTLEMENT'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
                    typeFilter === t
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 font-medium">Miembro:</span>
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
              >
                <option value="ALL">Todos los miembros</option>
                {group.members.map((m) => {
                  const u = allUsers.find((user) => user.id === m.userId);
                  return (
                    <option key={m.userId} value={m.userId}>
                      {u?.name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
            {filteredMovements.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No hay movimientos con los filtros seleccionados.
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
                      <span className="text-xs text-brand-600 font-medium">Ver desglose</span>
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
          <div className="p-4 bg-slate-100/70 rounded-2xl text-xs text-slate-600 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Todos los movimientos (gastos compartidos, individuales, préstamos y devoluciones) están unificados en un único balance neto. La suma total de los balances es exactamente 0,00 €.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {balances.map((b) => {
              const u = allUsers.find((user) => user.id === b.userId);
              const isPositive = b.netBalanceCents > 0;
              const isNegative = b.netBalanceCents < 0;

              return (
                <Card key={b.userId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={u?.name || 'Usuario'}
                        url={u?.avatarUrl}
                        size="md"
                        isProvisional={u?.isProvisional}
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {u?.name} {u?.id === currentUser.id ? '(Tú)' : ''}
                        </p>
                        <p className="text-xs text-slate-400">
                          {u?.isProvisional ? 'Participante provisional (sin cuenta)' : u?.email}
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
                      <span className="text-slate-400 block">Le corresponde asumir:</span>
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
              <span className="font-bold">Algoritmo de simplificación activo:</span> Minimiza las transferencias sin alterar las posiciones netas. Puedes pulsar <strong>Liquidar</strong> en cualquier deuda para registrar la devolución de inmediato.
            </p>
          </div>

          <div className="space-y-3">
            {simplifiedDebts.length === 0 ? (
              <Card className="text-center py-10">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-900">¡Todas las cuentas están saldadas!</p>
                <p className="text-xs text-slate-400">Nadie tiene deudas pendientes en este grupo.</p>
              </Card>
            ) : (
              simplifiedDebts.map((debt, idx) => {
                const fromUser = allUsers.find((u) => u.id === debt.fromUserId);
                const toUser = allUsers.find((u) => u.id === debt.toUserId);
                const isFromMe = debt.fromUserId === currentUser.id;
                const isToMe = debt.toUserId === currentUser.id;

                return (
                  <Card key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                      <Avatar
                        name={fromUser?.name || 'U'}
                        url={fromUser?.avatarUrl}
                        size="sm"
                        isProvisional={fromUser?.isProvisional}
                      />
                      <span className="font-bold text-slate-800 text-sm">
                        {fromUser?.name} {isFromMe ? '(Tú)' : ''}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">debe pagar a</span>
                      <Avatar
                        name={toUser?.name || 'U'}
                        url={toUser?.avatarUrl}
                        size="sm"
                        isProvisional={toUser?.isProvisional}
                      />
                      <span className="font-bold text-slate-800 text-sm">
                        {toUser?.name} {isToMe ? '(Tú)' : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className="text-base font-extrabold text-slate-900">
                        {formatCurrency(debt.amountCents)}
                      </span>
                      <button
                        onClick={() => handleOpenSettlement(debt)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                      >
                        Liquidar deuda
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: HISTORIAL DE LIQUIDACIONES */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Registro exclusivo de transferencias, bizums y devoluciones realizadas para saldar deudas pendientes.
          </p>

          <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
            {settlementMovements.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No se han registrado devoluciones ni liquidaciones todavía en este grupo.
              </div>
            ) : (
              settlementMovements.map((mov) => {
                const payer = allUsers.find((u) => u.id === mov.paidById);
                const recipient = allUsers.find((u) => u.id === mov.recipientId);

                return (
                  <div
                    key={mov.id}
                    onClick={() => setSelectedMovement(mov)}
                    className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{mov.concept}</p>
                        <p className="text-xs text-slate-500">
                          {payer?.name} devolvió a {recipient?.name} •{' '}
                          {new Date(mov.date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-700">
                        {formatCurrency(mov.amountCents)}
                      </span>
                      <span className="block text-[11px] text-slate-400">Ver liquidación</span>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      )}

      {/* TAB 5: CONFIGURACIÓN DE GRUPO Y MIEMBROS */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {configSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {configSuccessMsg}
            </div>
          )}

          {/* Formulario de Configuración Básica y Reparto */}
          <form onSubmit={handleSaveConfig}>
            <Card className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Configuración del Grupo</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nombre del Grupo
                  </label>
                  <input
                    type="text"
                    required
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={editGroupDesc}
                    onChange={(e) => setEditGroupDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Modalidad de reparto predeterminada
                </label>
                <select
                  value={editSplitMode}
                  onChange={(e) => setEditSplitMode(e.target.value as SplitMode)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="EQUAL">Partes iguales (Todos asumen la misma fracción)</option>
                  <option value="PERCENTAGE">Porcentajes personalizados por miembro</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Esta configuración se aplicará automáticamente al crear nuevos gastos compartidos.
                </p>
              </div>

              {/* Ajuste de Porcentajes */}
              {editSplitMode === 'PERCENTAGE' && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" /> Asignación de porcentajes por miembro:
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        isPercentageValid ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      Total: {totalPercentageSum.toFixed(2)}% {isPercentageValid ? '✓' : '(Debe sumar 100%)'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.members.map((m) => {
                      const u = allUsers.find((user) => user.id === m.userId);
                      return (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={u?.name || 'U'}
                              url={u?.avatarUrl}
                              size="sm"
                              isProvisional={u?.isProvisional}
                            />
                            <span className="font-medium text-slate-800">{u?.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={memberPercentages[m.userId] ?? m.percentage}
                              onChange={(e) =>
                                setMemberPercentages((prev) => ({
                                  ...prev,
                                  [m.userId]: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className="w-20 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-right font-bold text-slate-800 focus:ring-1 focus:ring-brand-500"
                            />
                            <span className="text-slate-400 font-bold">%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSavingConfig || (editSplitMode === 'PERCENTAGE' && !isPercentageValid)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingConfig ? 'Guardando...' : 'Guardar Configuración'}</span>
                </button>
              </div>
            </Card>
          </form>

          {/* Añadir Participante Provisional */}
          <Card className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-600" />
                <span>Añadir miembro</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Introduce el correo de una persona que ya esté registrada y haya verificado su cuenta en EquiGasto.
              </p>
            </div>

            <form onSubmit={handleAddProvisionalMember} className="flex gap-2">
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                required
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold whitespace-nowrap"
              >
                Añadir al grupo
              </button>
            </form>
          </Card>

          {/* Zona de peligro */}
          <Card className="space-y-3 border-rose-200">
            <div>
              <h3 className="text-base font-bold text-rose-700">Zona de peligro</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Eliminar el grupo borra de forma permanente todos sus movimientos y reparticiones.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteGroup}
              disabled={isDeletingGroup}
              className="px-4 py-2 border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-xl text-xs font-semibold"
            >
              {isDeletingGroup ? 'Eliminando...' : 'Eliminar grupo'}
            </button>
          </Card>
        </div>
      )}

      {/* Modal Detalle Movimiento */}
      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          users={allUsers}
          group={group}
          onClose={() => setSelectedMovement(null)}
          onDeleted={loadData}
          onEdit={(mov) => {
            setMovementToEdit(mov);
            setIsNewMovementModalOpen(true);
          }}
        />
      )}

      {/* Modal Nuevo Movimiento o Edición o Liquidación */}
      {isNewMovementModalOpen && (
        <NewMovementModal
          groups={[group]}
          currentUser={currentUser}
          initialGroupId={group.id}
          initialType={prefillSettlement ? 'SETTLEMENT' : undefined}
          initialPaidById={prefillSettlement?.paidById}
          initialRecipientId={prefillSettlement?.recipientId}
          initialAmountCents={prefillSettlement?.amountCents}
          initialConcept={prefillSettlement ? 'Liquidación de deuda' : undefined}
          movementToEdit={movementToEdit || undefined}
          onClose={() => {
            setIsNewMovementModalOpen(false);
            setPrefillSettlement(null);
            setMovementToEdit(null);
          }}
          onCreated={() => {
            setIsNewMovementModalOpen(false);
            setPrefillSettlement(null);
            setMovementToEdit(null);
            loadData();
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
};
