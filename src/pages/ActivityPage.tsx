import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, ArrowUpDown } from 'lucide-react';
import { repository } from '../data/index';
import { MovementImpact } from '../components/movements/MovementImpact';
import { Movement, Group, UserProfile } from '../core/types';
import { formatCurrency } from '../core/money';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { MovementDetailModal } from '../components/movements/MovementDetailModal';
import { NewMovementModal } from '../components/movements/NewMovementModal';

export const ActivityPage: React.FC = () => {
  const { refreshTrigger, triggerRefresh } = useOutletContext<{ refreshTrigger: number; triggerRefresh: () => void }>();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Filtros
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedMember, setSelectedMember] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [movementToEdit, setMovementToEdit] = useState<Movement | null>(null);

  const loadData = async () => {
    const movs = await repository.getMovements();
    const grps = await repository.getGroups();
    const usrs = await repository.getUsers();
    const cur = await repository.getCurrentUser();
    setMovements(movs);
    setGroups(grps);
    setUsers(usrs);
    setCurrentUser(cur);
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const filteredMovements = movements
    .filter((m) => {
      if (selectedType !== 'ALL' && m.type !== selectedType) return false;
      if (selectedGroup !== 'ALL' && m.groupId !== selectedGroup) return false;
      if (selectedMember !== 'ALL') {
        const isPayer = m.paidById === selectedMember;
        const isRecipient = m.recipientId === selectedMember;
        const isShare = m.shares.some((s) => s.userId === selectedMember);
        if (!isPayer && !isRecipient && !isShare) return false;
      }
      if (searchQuery.trim() && !m.concept.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeB !== timeA) {
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      const cA = new Date(a.createdAt || a.date).getTime();
      const cB = new Date(b.createdAt || b.date).getTime();
      return sortOrder === 'desc' ? cB - cA : cA - cB;
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Historial de Actividad
        </h1>
        <p className="text-sm text-slate-500">
          Registro cronológico detallado de todos los movimientos, gastos compartidos, préstamos y devoluciones.
        </p>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="space-y-3.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por concepto (cena, alquiler, billete...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
          {/* Grupo */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Todos los grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.icon} {g.name}
              </option>
            ))}
          </select>

          {/* Tipo */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="SHARED_EXPENSE">Compartidos</option>
            <option value="INDIVIDUAL_EXPENSE">Adelantos individuales</option>
            <option value="LOAN">Préstamos</option>
            <option value="SETTLEMENT">Liquidaciones</option>
            <option value="INCOME">Ingresos</option>
          </select>

          {/* Miembro */}
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Cualquier participante</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.id === currentUser?.id ? '(Tú)' : ''}
              </option>
            ))}
          </select>

          {/* Orden de fecha */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}</span>
          </button>
        </div>
      </Card>

      {/* Lista de Movimientos */}
      <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0 overflow-hidden">
        {filteredMovements.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No se han encontrado movimientos con los filtros aplicados.
          </div>
        ) : (
          filteredMovements.map((mov) => {
            const group = groups.find((g) => g.id === mov.groupId);
            const isSingleGroup = group?.members.length === 1;
            const payer = users.find((u) => u.id === mov.paidById);
            const payerName = payer?.name.split(' ')[0] || currentUser?.name.split(' ')[0] || 'Compañero';
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
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 mb-0.5">
                    {monthStr}
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
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

      {/* Modal Detalle Movimiento */}
      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          users={users}
          group={groups.find((g) => g.id === selectedMovement.groupId)}
          onClose={() => setSelectedMovement(null)}
          onDeleted={loadData}
          onEdit={(mov) => {
            setMovementToEdit(mov);
          }}
        />
      )}

      {/* Modal Edición de Movimiento */}
      {movementToEdit && (
        <NewMovementModal
          groups={groups}
          currentUser={currentUser || { id: 'user-1', name: 'Usuario', email: null }}
          movementToEdit={movementToEdit}
          onClose={() => setMovementToEdit(null)}
          onCreated={() => {
            setMovementToEdit(null);
            loadData();
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
};
