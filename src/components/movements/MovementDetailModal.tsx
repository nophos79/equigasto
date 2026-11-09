import React from 'react';
import { X, Trash2, Calendar, Edit3 } from 'lucide-react';
import { Movement, UserProfile, Group } from '../../core/types';
import { formatCurrency } from '../../core/money';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { repository } from '../../data/index';

interface MovementDetailModalProps {
  movement: Movement;
  users: UserProfile[];
  group?: Group;
  onClose: () => void;
  onDeleted: () => void;
  onEdit?: (movement: Movement) => void;
}

export const MovementDetailModal: React.FC<MovementDetailModalProps> = ({
  movement,
  users,
  group,
  onClose,
  onDeleted,
  onEdit,
}) => {
  const payer = users.find((u) => u.id === movement.paidById);
  const recipient = movement.recipientId ? users.find((u) => u.id === movement.recipientId) : undefined;

  const handleDelete = async () => {
    if (
      confirm(
        `¿Estás seguro de que deseas eliminar este movimiento "${movement.concept}"? Los balances del grupo se recalcularán automáticamente.`
      )
    ) {
      await repository.deleteMovement(movement.id);
      onDeleted();
      onClose();
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge type={movement.type} />
            {group && (
              <span className="text-xs font-medium text-slate-500">
                {group.icon} {group.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Title */}
        <div className="p-6 text-center border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">{movement.concept}</h2>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(movement.amountCents)}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(movement.date)}</span>
          </div>
        </div>

        {/* Content details */}
        <div className="p-6 space-y-4">
          {/* Pagador / Actor */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <Avatar
                name={payer?.name || 'Usuario'}
                url={payer?.avatarUrl}
                size="sm"
              />
              <div>
                <p className="text-xs text-slate-400 font-medium">
                  {movement.type === 'LOAN'
                    ? 'Prestamista'
                    : movement.type === 'SETTLEMENT'
                    ? 'Quién devolvió el dinero'
                    : 'Pagado íntegramente por'}
                </p>
                <p className="text-sm font-bold text-slate-900">{payer?.name}</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-emerald-600">
              +{formatCurrency(movement.amountCents)}
            </span>
          </div>

          {/* Si es adelanto, préstamo o devolución directa */}
          {recipient && (
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Avatar
                  name={recipient.name}
                  url={recipient.avatarUrl}
                  size="sm"
                />
                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    {movement.type === 'LOAN'
                      ? 'Receptor del préstamo'
                      : movement.type === 'SETTLEMENT'
                      ? 'Receptor de la devolución'
                      : 'Beneficiario del adelanto'}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{recipient.name}</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-rose-600">
                -{formatCurrency(movement.amountCents)}
              </span>
            </div>
          )}

          {/* Desglose de reparto (si es compartido) */}
          {movement.type === 'SHARED_EXPENSE' && movement.shares.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Distribución económica ({movement.splitMode === 'PERCENTAGE' ? 'Porcentual' : 'Equitativo'})
              </h3>
              <div className="space-y-2">
                {movement.shares.map((share) => {
                  const shareUser = users.find((u) => u.id === share.userId);
                  return (
                    <div
                      key={share.userId}
                      className="flex items-center justify-between text-sm py-2 px-3 border border-slate-100 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={shareUser?.name || 'Usuario'}
                          url={shareUser?.avatarUrl}
                          size="sm"
                        />
                        <span className="font-medium text-slate-800">{shareUser?.name}</span>
                        {share.percentage && (
                          <span className="text-xs text-slate-400">({share.percentage}%)</span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(share.amountCents)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar</span>
          </button>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onEdit(movement);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
