import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  UserPlus,
  Save,
  Percent,
} from 'lucide-react';
import { repository } from '../data/index';
import { MovementImpact } from '../components/movements/MovementImpact';
import { useRealtime } from '../hooks/useRealtime';
import { Group, Movement, UserProfile, MemberBalance, SimplifiedDebt, SplitMode } from '../core/types';
import { formatCurrency, formatPercentage } from '../core/money';
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
  const [conceptSearchQuery, setConceptSearchQuery] = useState('');
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
  const [percentageInputs, setPercentageInputs] = useState<Record<string, string>>({});
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
  const filteredMovements = movements
    .filter((m) => {
      if (conceptSearchQuery.trim() && !m.concept.toLowerCase().includes(conceptSearchQuery.trim().toLowerCase())) {
        return false;
      }
      if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
      if (memberFilter !== 'ALL') {
        const isPayer = m.paidById === memberFilter;
        const isRecipient = m.recipientId === memberFilter;
        const isShareMember = m.shares.some((s) => s.userId === memberFilter);
        if (!isPayer && !isRecipient && !isShareMember) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      // En un mismo día: orden de grabación (created_at más reciente primero)
      const createdA = new Date(a.createdAt || a.date).getTime();
      const createdB = new Date(b.createdAt || b.date).getTime();
      return createdB - createdA;
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
      alert(`La suma de los porcentajes debe ser exactamente 100% (actualmente: ${formatPercentage(totalPercentageSum)})`);
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

  const handleAddMember = async (e: React.FormEvent) => {
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

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
          {/* Fila superior: Icono + Nombre + Badges */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl sm:text-3xl p-2 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
              {group.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate min-w-0" title={group.name}>
                  {group.name}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  {group.members.length === 1 ? 'Personal' : `${group.members.length} miembros`}
                </span>
              </div>
              {group.description && (
                <p className="text-xs text-slate-500 mt-0.5 truncate min-w-0" title={group.description}>
                  {group.description}
                </p>
              )}
            </div>
          </div>

          {/* Fila inferior: Píldora de saldo debajo del grupo */}
          <div
            className={`mt-2.5 p-2.5 sm:p-3 rounded-xl flex items-center justify-between border ${
              group.members.length === 1
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60'
                : (currentUserBalance?.netBalanceCents || 0) > 0
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
                : (currentUserBalance?.netBalanceCents || 0) < 0
                ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span
              className={`text-sm font-bold ${
                group.members.length === 1
                  ? 'text-indigo-800 dark:text-indigo-300'
                  : (currentUserBalance?.netBalanceCents || 0) > 0
                  ? 'text-emerald-800 dark:text-emerald-300'
                  : (currentUserBalance?.netBalanceCents || 0) < 0
                  ? 'text-rose-800 dark:text-rose-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {group.members.length === 1
                ? 'Balance'
                : (currentUserBalance?.netBalanceCents || 0) > 0
                ? 'Te deben'
                : (currentUserBalance?.netBalanceCents || 0) < 0
                ? 'Debes'
                : 'Al día'}
            </span>
            <span
              className={`text-base sm:text-lg font-black ${
                group.members.length === 1
                  ? (currentUserBalance?.netBalanceCents || 0) >= 0
                    ? 'text-indigo-900 dark:text-indigo-200'
                    : 'text-rose-700 dark:text-rose-400'
                  : (currentUserBalance?.netBalanceCents || 0) > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : (currentUserBalance?.netBalanceCents || 0) < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {group.members.length === 1
                ? formatCurrency(currentUserBalance?.netBalanceCents || 0, { showSign: true })
                : (currentUserBalance?.netBalanceCents || 0) === 0
                ? '0,00 €'
                : ((currentUserBalance?.netBalanceCents || 0) > 0 ? '+' : '-') +
                  formatCurrency(Math.abs(currentUserBalance?.netBalanceCents || 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Controles: Selector de Sección (Ver), Filtros y Búsqueda */}
      <div className="space-y-2.5 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        {/* Fila de Desplegables perfectamente alineados */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Sección Ver */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
            <span className="text-xs font-semibold text-slate-400 shrink-0">Ver:</span>
            <select
              id="group-section-select"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="movements">Movimientos ({movements.length})</option>
              {group.members.length > 1 && (
                <>
                  <option value="balances">
                    Balances ({balances.filter((b) => b.paidCents !== 0 || b.shouldPayCents !== 0).length})
                  </option>
                  <option value="debts">Deudas Simplificadas ({simplifiedDebts.length})</option>
                  <option value="settlements">Liquidaciones ({settlementMovements.length})</option>
                </>
              )}
              <option value="config">Configuración del grupo</option>
            </select>
          </div>

          {/* Filtros de Tipo y Miembro (cuando estamos en la sección de movimientos) */}
          {activeTab === 'movements' && (
            <>
              <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                <span className="text-xs font-semibold text-slate-400 shrink-0">Tipo:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Todos los tipos</option>
                  {group.members.length === 1 ? (
                    <>
                      <option value="SHARED_EXPENSE">Gastos</option>
                      <option value="INCOME">Ingresos</option>
                    </>
                  ) : (
                    <>
                      <option value="SHARED_EXPENSE">Compartidos</option>
                      <option value="INDIVIDUAL_EXPENSE">Adelantos</option>
                      <option value="LOAN">Préstamos</option>
                      <option value="SETTLEMENT">Liquidaciones</option>
                    </>
                  )}
                </select>
              </div>

              {group.members.length > 1 && (
                <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                  <span className="text-xs font-semibold text-slate-400 shrink-0">Miembro:</span>
                  <select
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Todos los miembros</option>
                    {group.members.map((m) => {
                      const u = allUsers.find((user) => user.id === m.userId);
                      return (
                        <option key={m.userId} value={m.userId}>
                          {u?.name || 'Usuario'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Buscador de concepto (solo en movimientos) */}
        {activeTab === 'movements' && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por concepto..."
              value={conceptSearchQuery}
              onChange={(e) => setConceptSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {conceptSearchQuery && (
              <button
                type="button"
                onClick={() => setConceptSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: MOVIMIENTOS */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0 overflow-hidden">
            {filteredMovements.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                No hay movimientos con los filtros seleccionados.
              </div>
            ) : (
              filteredMovements.map((mov) => {
                const isSingleGroup = group.members.length === 1;
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
                    {/* Fecha como primer dato en formato visible y compacto */}
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
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        Pagó <span className="font-semibold text-slate-700 dark:text-slate-300">{payerName}</span>
                      </p>
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
      )}

      {/* TAB 2: BALANCES */}
      {activeTab === 'balances' && (
        <div className="space-y-4">


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {balances.map((b) => {
              const u = allUsers.find((user) => user.id === b.userId);
              const isPositive = b.netBalanceCents > 0;
              const isNegative = b.netBalanceCents < 0;
              const isMe = b.userId === currentUser.id;

              return (
                <Card key={b.userId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={u?.name || 'Usuario'}
                        url={u?.avatarUrl}
                        size="md"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {u?.name} {isMe ? '(Tú)' : ''}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {u?.email}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-base font-black px-2.5 py-1 rounded-xl ${
                        isPositive
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : isNegative
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {formatCurrency(b.netBalanceCents, { showSign: true })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                    <div>
                      <span className="text-slate-400 dark:text-slate-400 block">
                        {isMe ? 'Has pagado:' : 'Ha pagado:'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(b.paidCents)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-400 block">
                        {isMe ? 'Te toca asumir:' : 'Le toca asumir:'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(b.shouldPayCents)}</span>
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
                      />
                      <span className="font-bold text-slate-800 text-sm">
                        {fromUser?.name} {isFromMe ? '(Tú)' : ''}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">debe pagar a</span>
                      <Avatar
                        name={toUser?.name || 'U'}
                        url={toUser?.avatarUrl}
                        size="sm"
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
          <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0 overflow-hidden">
            {settlementMovements.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No se han registrado devoluciones ni liquidaciones todavía en este grupo.
              </div>
            ) : (
              settlementMovements.map((mov) => {
                const payer = allUsers.find((u) => u.id === mov.paidById);
                const recipient = allUsers.find((u) => u.id === mov.recipientId);
                const payerName = payer?.name.split(' ')[0] || currentUser.name.split(' ')[0] || 'Compañero';
                const recipientName = recipient?.name.split(' ')[0] || 'Compañero';
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

                    {/* Detalle */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                          Liquidación
                        </span>
                        <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
                          {mov.concept}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        <strong className="text-slate-700 dark:text-slate-300">{payerName}</strong> pagó a <strong className="text-slate-700 dark:text-slate-300">{recipientName}</strong>
                      </p>
                    </div>

                    {/* Importe */}
                    <div className="text-right shrink-0">
                      <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(mov.amountCents)}
                      </p>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Liquidado</span>
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Configuración del Grupo</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nombre del Grupo
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={35}
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={editGroupDesc}
                    onChange={(e) => setEditGroupDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
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
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" /> Asignación de porcentajes por miembro:
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        isPercentageValid ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      Total: {formatPercentage(totalPercentageSum)} {isPercentageValid ? '✓' : '(Debe sumar 100%)'}
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
                            />
                            <span className="font-medium text-slate-800">{u?.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={percentageInputs[m.userId] ?? formatPercentage(memberPercentages[m.userId] ?? m.percentage, false)}
                              onChange={(e) => {
                                const raw = e.target.value.replace(',', '.');
                                if (raw === '') {
                                  setPercentageInputs((prev) => ({ ...prev, [m.userId]: '' }));
                                  setMemberPercentages((prev) => ({ ...prev, [m.userId]: 0 }));
                                  return;
                                }
                                // Limitar: máximo 3 dígitos enteros y hasta 2 decimales
                                if (!/^\d{0,3}(\.\d{0,2})?$/.test(raw)) return;
                                const num = parseFloat(raw);
                                if (!isNaN(num) && num > 100) return;
                                setPercentageInputs((prev) => ({ ...prev, [m.userId]: e.target.value }));
                                setMemberPercentages((prev) => ({ ...prev, [m.userId]: isNaN(num) ? 0 : num }));
                              }}
                              onBlur={() => {
                                const current = memberPercentages[m.userId] || 0;
                                const clamped = Math.min(100, Math.max(0, current));
                                setPercentageInputs((prev) => ({
                                  ...prev,
                                  [m.userId]: formatPercentage(clamped, false),
                                }));
                                setMemberPercentages((prev) => ({
                                  ...prev,
                                  [m.userId]: clamped,
                                }));
                              }}
                              className="w-24 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500"
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

          {/* Añadir miembro por correo (usuario registrado y verificado) */}
          <Card className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-600" />
                <span>Añadir miembro</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Introduce el correo de una persona que ya esté registrada y haya verificado su cuenta en EquiGasto.
              </p>
            </div>

            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                required
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-brand-600 dark:hover:bg-brand-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap"
              >
                Añadir al grupo
              </button>
            </form>
          </Card>

          {/* Zona de peligro (solo el creador del grupo) */}
          {currentUser.id === group.createdBy && (
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
          )}
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
