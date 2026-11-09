import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Plus, Users, X, UserPlus, Trash2 } from 'lucide-react';
import { repository } from '../data/mockRepository';
import { Group, SplitMode, UserProfile } from '../core/types';
import { formatCurrency } from '../core/money';
import { Card } from '../components/common/Card';

export const GroupsPage: React.FC = () => {
  const { refreshTrigger, triggerRefresh } = useOutletContext<{ refreshTrigger: number; triggerRefresh: () => void }>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [groupBalances, setGroupBalances] = useState<Record<string, number>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form states for new group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('🏖️');
  const [newGroupSplitMode, setNewGroupSplitMode] = useState<SplitMode>('EQUAL');
  const [initialInvitedNames, setInitialInvitedNames] = useState<string[]>(['']);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadData = async () => {
    const user = await repository.getCurrentUser();
    const grps = await repository.getGroups();
    setCurrentUser(user);
    setGroups(grps);

    const balancesMap: Record<string, number> = {};
    for (const g of grps) {
      const gBalances = await repository.getGroupBalances(g.id);
      const userB = gBalances.find((b) => b.userId === user.id);
      balancesMap[g.id] = userB ? userB.netBalanceCents : 0;
    }
    setGroupBalances(balancesMap);
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleAddInvitedField = () => {
    setInitialInvitedNames([...initialInvitedNames, '']);
  };

  const handleInvitedNameChange = (index: number, val: string) => {
    const copy = [...initialInvitedNames];
    copy[index] = val;
    setInitialInvitedNames(copy);
  };

  const handleRemoveInvitedField = (index: number) => {
    setInitialInvitedNames(initialInvitedNames.filter((_, i) => i !== index));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !currentUser || isCreating) return;

    setIsCreating(true);
    setCreateError('');
    try {
      // Crear el grupo inicialmente con el creador
      const createdGroup = await repository.createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
        icon: newGroupIcon,
        category: 'friends',
        createdBy: currentUser.id,
        defaultSplitMode: newGroupSplitMode,
        members: [{ userId: currentUser.id, role: 'ADMIN', percentage: 100 }],
      });

      // Añadir los miembros indicados (usuarios registrados y verificados)
      const validNames = initialInvitedNames.map((n) => n.trim()).filter(Boolean);
      const failed: string[] = [];
      for (const memberEmail of validNames) {
        try {
          await repository.addMemberByEmail(createdGroup.id, memberEmail);
        } catch (err) {
          failed.push(memberEmail + ': ' + (err instanceof Error ? err.message : 'error'));
        }
      }
      if (failed.length > 0) {
        alert('El grupo se creó, pero no se pudo añadir a:\n' + failed.join('\n'));
      }

      setIsCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setInitialInvitedNames(['']);
      triggerRefresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear el grupo');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mis Grupos
          </h1>
          <p className="text-sm text-slate-500">
            Administra tus viajes, pisos compartidos y salidas con amigos.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Grupo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {groups.map((group) => {
          const balanceCents = groupBalances[group.id] || 0;
          return (
            <Link key={group.id} to={`/groups/${group.id}`} className="group">
              <Card hoverable className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl p-2 bg-slate-50 rounded-2xl border border-slate-100">
                      {group.icon}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {group.members.length} miembros
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors mb-1">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                    {group.description || 'Sin descripción'}
                  </p>

                  <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-2.5 mb-2">
                    <span className="font-medium text-slate-700">Reparto por defecto: </span>
                    {group.defaultSplitMode === 'EQUAL' ? 'Partes iguales' : 'Porcentual'}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Tu saldo neto</span>
                  <span
                    className={`text-sm font-bold ${
                      balanceCents > 0
                        ? 'text-emerald-600'
                        : balanceCents < 0
                        ? 'text-rose-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {formatCurrency(balanceCents, { showSign: true })}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Modal Crear Grupo */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Crear Nuevo Grupo</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Icono / Emoji</label>
                <div className="flex gap-2">
                  {['🏖️', '🏠', '🎾', '🍻', '🚗', '🎁'].map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setNewGroupIcon(emoji)}
                      className={`text-xl p-2.5 rounded-xl border transition-all ${
                        newGroupIcon === emoji
                          ? 'border-brand-500 bg-brand-50 scale-105'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Grupo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Viaje a Roma, Gastos Casa..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción opcional</label>
                <input
                  type="text"
                  placeholder="Ej: Gastos de gasolina, cenas y entradas"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Modalidad de reparto base</label>
                <select
                  value={newGroupSplitMode}
                  onChange={(e) => setNewGroupSplitMode(e.target.value as SplitMode)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="EQUAL">Partes iguales (Todos pagan igual)</option>
                  <option value="PERCENTAGE">Porcentajes personalizados</option>
                </select>
              </div>

              {/* Añadir miembros iniciales */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" /> Añadir miembros (correo de usuarios registrados):
                  </label>
                  <button
                    type="button"
                    onClick={handleAddInvitedField}
                    className="text-xs text-brand-600 font-semibold hover:text-brand-700"
                  >
                    + Añadir otro
                  </button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {initialInvitedNames.map((name, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="email"
                        placeholder={`correo${idx + 1}@ejemplo.com`}
                        value={name}
                        onChange={(e) => handleInvitedNameChange(idx, e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                      {initialInvitedNames.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInvitedField(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium break-words">
                  {createError}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-500/20"
                >
                  {isCreating ? 'Creando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
