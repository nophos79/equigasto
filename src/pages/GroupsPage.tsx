import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Plus, Users, X, UserPlus, Trash2, User } from 'lucide-react';
import { repository } from '../data/index';
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
  const [groupType, setGroupType] = useState<'SHARED' | 'INDIVIDUAL'>('SHARED');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadData = async () => {
    const user = await repository.getCurrentUser();
    const grps = await repository.getGroups();
    setCurrentUser(user);
    setGroups(grps);

    const balancesMap: Record<string, number> = {};
    for (const g of grps) {
      if (g.members.length === 1) {
        const movs = await repository.getMovements(g.id);
        const inc = movs.filter((m) => m.type === 'INCOME').reduce((a, m) => a + m.amountCents, 0);
        const exp = movs.filter((m) => m.type !== 'INCOME').reduce((a, m) => a + m.amountCents, 0);
        balancesMap[g.id] = inc - exp;
      } else {
        const gBalances = await repository.getGroupBalances(g.id);
        const userB = gBalances.find((b) => b.userId === user.id);
        balancesMap[g.id] = userB ? userB.netBalanceCents : 0;
      }
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
        category: groupType === 'INDIVIDUAL' ? 'other' : 'friends',
        createdBy: currentUser.id,
        defaultSplitMode: newGroupSplitMode,
        members: [{ userId: currentUser.id, role: 'ADMIN', percentage: 100 }],
      });

      // Añadir los miembros indicados si es compartido
      if (groupType === 'SHARED') {
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
      }

      setIsCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setInitialInvitedNames(['']);
      setGroupType('SHARED');
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mis Grupos
          </h1>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Grupo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

      {/* Modal Crear Grupo */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Crear Nuevo Grupo</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              {/* Selector de finalidad: Compartido vs Individual */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Finalidad del grupo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGroupType('SHARED');
                      setNewGroupIcon('🏖️');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      groupType === 'SHARED'
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Compartido</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupType('INDIVIDUAL');
                      setNewGroupIcon('👤');
                      setNewGroupSplitMode('EQUAL');
                      setInitialInvitedNames(['']);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      groupType === 'INDIVIDUAL'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Individual</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Icono / Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  {(groupType === 'INDIVIDUAL' ? ['👤', '💼', '📊', '💳', '🛒', '☕', '🏠'] : ['🏖️', '🏠', '🎾', '🍻', '🚗', '🎁']).map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setNewGroupIcon(emoji)}
                      className={`text-xl p-2.5 rounded-xl border transition-all ${
                        newGroupIcon === emoji
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 scale-105'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-800/60'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nombre del Grupo</label>
                <input
                  type="text"
                  required
                  maxLength={35}
                  placeholder={groupType === 'INDIVIDUAL' ? 'Ej: Mis Gastos Diarios, Presupuesto Casa...' : 'Ej: Viaje a Roma, Gastos Casa...'}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Descripción opcional</label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder={groupType === 'INDIVIDUAL' ? 'Ej: Control personal de compras y suscripciones' : 'Ej: Gastos de gasolina, cenas y entradas'}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {groupType === 'SHARED' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Modalidad de reparto base</label>
                    <select
                      value={newGroupSplitMode}
                      onChange={(e) => setNewGroupSplitMode(e.target.value as SplitMode)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="EQUAL">Partes iguales (Todos pagan igual)</option>
                      <option value="PERCENTAGE">Porcentajes personalizados</option>
                    </select>
                  </div>

                  {/* Añadir miembros iniciales */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" /> Añadir miembros (correo de usuarios registrados):
                      </label>
                      <button
                        type="button"
                        onClick={handleAddInvitedField}
                        className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:text-brand-700 dark:hover:text-brand-300"
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
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
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
                </>
              ) : (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-800 dark:text-indigo-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    Grupo individual para tus finanzas privadas
                  </p>
                  <p className="text-indigo-600 dark:text-indigo-400 text-[11px] leading-relaxed">
                    Tus gastos aquí no se mezclan con deudas de amigos ni viajes compartidos.
                  </p>
                </div>
              )}

              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium break-words">
                  {createError}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
