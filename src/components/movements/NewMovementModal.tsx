import React, { useState, useEffect } from 'react';
import { X, Users, UserCheck, ArrowRightLeft, CreditCard, Percent, AlertCircle } from 'lucide-react';
import { Group, MovementType, SplitMode, UserProfile, Movement, SimplifiedDebt } from '../../core/types';
import { eurosToCents, centsToEuros, splitEqually, formatCurrency } from '../../core/money';
import { splitByPercentages } from '../../core/split';
import { validateSettlement } from '../../core/settlement';
import { repository } from '../../data/index';

interface NewMovementModalProps {
  groups: Group[];
  currentUser: UserProfile;
  initialGroupId?: string;
  initialType?: MovementType;
  initialPaidById?: string;
  initialRecipientId?: string;
  initialAmountCents?: number;
  initialConcept?: string;
  movementToEdit?: Movement;
  onClose: () => void;
  onCreated: (movement: Movement) => void;
}

export const NewMovementModal: React.FC<NewMovementModalProps> = ({
  groups,
  currentUser,
  initialGroupId,
  initialType,
  initialPaidById,
  initialRecipientId,
  initialAmountCents,
  initialConcept,
  movementToEdit,
  onClose,
  onCreated,
}) => {
  const isEditing = Boolean(movementToEdit);

  const [selectedGroupId, setSelectedGroupId] = useState(
    movementToEdit?.groupId || initialGroupId || groups[0]?.id || ''
  );
  const [type, setType] = useState<MovementType>(
    movementToEdit?.type || initialType || 'SHARED_EXPENSE'
  );
  const [concept, setConcept] = useState(
    movementToEdit?.concept || initialConcept || ''
  );
  const [amountInput, setAmountInput] = useState(
    movementToEdit
      ? centsToEuros(movementToEdit.amountCents).toString()
      : initialAmountCents
      ? centsToEuros(initialAmountCents).toString()
      : ''
  );
  const [date, setDate] = useState(
    movementToEdit
      ? movementToEdit.date.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [paidById, setPaidById] = useState(
    movementToEdit?.paidById || initialPaidById || currentUser.id
  );
  const [recipientId, setRecipientId] = useState(
    movementToEdit?.recipientId || initialRecipientId || ''
  );
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [groupDebts, setGroupDebts] = useState<SimplifiedDebt[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    repository.getUsers().then(setAllUsers);
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      repository.getGroupDebts(selectedGroupId).then(setGroupDebts);
    }
  }, [selectedGroupId]);

  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  // El modo de reparto se define a nivel de grupo (Configuración del grupo)
  const splitMode: SplitMode = currentGroup?.defaultSplitMode ?? 'EQUAL';

  useEffect(() => {
    if (currentGroup && !isEditing) {

      if (!initialRecipientId) {
        const otherMember = currentGroup.members.find((m) => m.userId !== paidById);
        if (otherMember) {
          setRecipientId(otherMember.userId);
        }
      }
    }
  }, [selectedGroupId, currentGroup, isEditing, initialType, initialRecipientId, paidById]);

  const groupMembers = currentGroup
    ? currentGroup.members.map((m) => {
        const u = allUsers.find((user) => user.id === m.userId);
        return {
          ...m,
          name: u ? u.name : 'Usuario',
        };
      })
    : [];

  // Calcular la suma actual de porcentajes cuando se está en modo porcentaje
  const totalPercentageSum = groupMembers.reduce((acc, m) => acc + (m.percentage || 0), 0);
  const isPercentageValid = Math.abs(totalPercentageSum - 100) < 0.05;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = eurosToCents(amountInput);
    if (!amountCents || amountCents <= 0) {
      alert('Introduce un importe válido superior a 0');
      return;
    }
    if (!concept.trim()) {
      alert('Introduce un concepto para el movimiento');
      return;
    }

    if (type === 'SHARED_EXPENSE' && splitMode === 'PERCENTAGE' && !isPercentageValid) {
      alert(`Los porcentajes del grupo suman ${totalPercentageSum.toFixed(2)}%. Corrígelos en Configuración del grupo para poder repartir.`);
      return;
    }

    setIsSubmitting(true);

    let shares: { userId: string; amountCents: number; percentage?: number }[] = [];

    if (type === 'SHARED_EXPENSE') {
      const memberCount = groupMembers.length;
      if (splitMode === 'EQUAL') {
        const splits = splitEqually(amountCents, memberCount);
        shares = groupMembers.map((m, idx) => ({
          userId: m.userId,
          amountCents: splits[idx],
        }));
      } else {
        // Porcentual determinista con Resto Mayor (Hare-Niemeyer)
        const pctConfigs = groupMembers.map((m) => ({
          userId: m.userId,
          percentage: m.percentage,
        }));
        shares = splitByPercentages(amountCents, pctConfigs);
      }
    } else if (type === 'INDIVIDUAL_EXPENSE' || type === 'LOAN') {
      shares = [{ userId: recipientId, amountCents }];
    }

    try {
      let savedMov: Movement;
      if (isEditing && movementToEdit) {
        savedMov = await repository.updateMovement(movementToEdit.id, {
          groupId: selectedGroupId,
          type,
          concept: concept.trim(),
          amountCents,
          paidById,
          recipientId: type !== 'SHARED_EXPENSE' ? recipientId : undefined,
          splitMode: type === 'SHARED_EXPENSE' ? splitMode : undefined,
          date: new Date(date).toISOString(),
          shares,
        });
      } else {
        savedMov = await repository.createMovement({
          groupId: selectedGroupId,
          type,
          concept: concept.trim(),
          amountCents,
          paidById,
          recipientId: type !== 'SHARED_EXPENSE' ? recipientId : undefined,
          splitMode: type === 'SHARED_EXPENSE' ? splitMode : undefined,
          date: new Date(date).toISOString(),
          shares,
        });
      }

      onCreated(savedMov);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? 'Editar Movimiento' : 'Registrar Movimiento'}
            </h2>
            <p className="text-xs text-slate-400">
              {type === 'SETTLEMENT' ? 'Liquidación de saldos y devoluciones' : 'Rápido, exacto y sin complicaciones'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tipo de movimiento selector (deshabilitado en edición para preservar la naturaleza) */}
        {!isEditing && (
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setType('SHARED_EXPENSE')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                type === 'SHARED_EXPENSE'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Compartido</span>
            </button>

            <button
              type="button"
              onClick={() => setType('INDIVIDUAL_EXPENSE')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                type === 'INDIVIDUAL_EXPENSE'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Adelanto</span>
            </button>

            <button
              type="button"
              onClick={() => setType('LOAN')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                type === 'LOAN'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Préstamo</span>
            </button>

            <button
              type="button"
              onClick={() => setType('SETTLEMENT')}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                type === 'SETTLEMENT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Devolución</span>
            </button>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Grupo */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Grupo</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Importe grande */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Importe (€)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full text-2xl font-bold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                €
              </span>
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Concepto</label>
            <input
              type="text"
              placeholder={
                type === 'SHARED_EXPENSE'
                  ? 'Ej: Cena en restaurante, compra semanal'
                  : type === 'INDIVIDUAL_EXPENSE'
                  ? 'Ej: Billete de tren de Luis'
                  : type === 'LOAN'
                  ? 'Ej: Préstamo para fianza'
                  : 'Ej: Devolución Bizum'
              }
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Pagador y Receptor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {type === 'LOAN'
                  ? 'Quién presta'
                  : type === 'SETTLEMENT'
                  ? 'Quién devuelve dinero'
                  : 'Quién ha pagado'}
              </label>
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {groupMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name} {m.userId === currentUser.id ? '(Tú)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {type !== 'SHARED_EXPENSE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {type === 'LOAN'
                    ? 'Quién recibe'
                    : type === 'INDIVIDUAL_EXPENSE'
                    ? 'Quién debe el 100%'
                    : 'Quién recibe la devolución'}
                </label>
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {groupMembers
                    .filter((m) => m.userId !== paidById)
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name} {m.userId === currentUser.id ? '(Tú)' : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Ajuste de porcentajes            )}
          </div>

          {/* Reparto definido a nivel de grupo (solo lectura) */}
          {type === 'SHARED_EXPENSE' && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <p className="font-semibold text-slate-700 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" />
                {splitMode === 'EQUAL'
                  ? 'Reparto a partes iguales (configuración del grupo)'
                  : 'Reparto porcentual (configuración del grupo)'}
              </p>

              {splitMode === 'EQUAL' ? (
                <p className="text-slate-500">
                  {groupMembers.map((m) => m.name).join(', ')} ({groupMembers.length} personas)
                </p>
              ) : (
                <div className="space-y-1">
                  {groupMembers.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between text-slate-600">
                      <span className="truncate">{m.name}</span>
                      <span className="font-medium">{m.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}

              {splitMode === 'PERCENTAGE' && !isPercentageValid && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Los porcentajes del grupo suman {totalPercentageSum.toFixed(2)}%. Corrígelos en la configuración del grupo.
                </p>
              )}
            </div>
          )}
          {/* Aviso inteligente de liquidación / deuda inversa */}
          {type === 'SETTLEMENT' && amountInput && (
            (() => {
              const validation = validateSettlement(
                paidById,
                recipientId,
                eurosToCents(amountInput),
                groupDebts
              );
              if (validation.warningMessage) {
                return (
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900 space-y-2">
                    <p className="flex items-start gap-1.5 font-medium">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{validation.warningMessage}</span>
                    </p>
                    {validation.currentDebtCents > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmountInput(centsToEuros(validation.currentDebtCents).toString())}
                        className="text-[11px] font-bold text-amber-800 underline hover:text-amber-900"
                      >
                        Ajustar importe a la deuda exacta ({formatCurrency(validation.currentDebtCents)})
                      </button>
                    )}
                  </div>
                );
              }
              return null;
            })()
          )}

          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (type === 'SHARED_EXPENSE' && splitMode === 'PERCENTAGE' && !isPercentageValid)}
              className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
