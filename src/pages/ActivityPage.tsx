import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search } from 'lucide-react';
import { repository } from '../data/mockRepository';
import { Movement, Group, UserProfile } from '../core/types';
import { formatCurrency } from '../core/money';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { MovementDetailModal } from '../components/movements/MovementDetailModal';

export const ActivityPage: React.FC = () => {
  const { refreshTrigger } = useOutletContext<{ refreshTrigger: number }>();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

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

  const filteredMovements = movements.filter((m) => {
    if (selectedType !== 'ALL' && m.type !== selectedType) return false;
    if (selectedGroup !== 'ALL' && m.groupId !== selectedGroup) return false;
    if (searchQuery.trim() && !m.concept.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Historial de Actividad
        </h1>
        <p className="text-sm text-slate-500">
          Registro cronológico de todos los movimientos, gastos compartidos, préstamos y devoluciones.
        </p>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por concepto (cena, alquiler, billete...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">Todos los grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.icon} {g.name}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">Todos los tipos de operación</option>
            <option value="SHARED_EXPENSE">Gastos compartidos</option>
            <option value="INDIVIDUAL_EXPENSE">Gastos individuales (Adelantos)</option>
            <option value="LOAN">Préstamos</option>
            <option value="SETTLEMENT">Liquidaciones (Devoluciones)</option>
          </select>
        </div>
      </Card>

      {/* Lista de Movimientos */}
      <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
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
                    isProvisional={payer?.isProvisional}
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
                  <span className="text-xs text-brand-600 font-medium">Ver detalle</span>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          users={users}
          group={groups.find((g) => g.id === selectedMovement.groupId)}
          onClose={() => setSelectedMovement(null)}
          onDeleted={loadData}
        />
      )}
    </div>
  );
};
