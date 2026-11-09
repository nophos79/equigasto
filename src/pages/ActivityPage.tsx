import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, ArrowUpDown } from 'lucide-react';
import { repository } from '../data/index';
import { MovementImpact } from '../components/movements/MovementImpact';
import { Movement, Group, UserProfile } from '../core/types';
import { formatCurrency } from '../core/money';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
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
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
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
            <option value="SHARED_EXPENSE">Gastos compartidos</option>
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
            const payer = users.find((u) => u.id === mov.paidById);
            const group = groups.find((g) => g.id === mov.groupId);
            const isPayerMe = mov.paidById === currentUser?.id;

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
