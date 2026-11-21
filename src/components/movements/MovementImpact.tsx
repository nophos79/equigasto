import React from 'react';
import type { Movement } from '../../core/types';
import { calculateMovementImpact } from '../../core/balance';
import { formatCurrency } from '../../core/money';

interface MovementImpactProps {
  movement: Movement;
  userId?: string;
  isSingleMemberGroup?: boolean;
}

/** Cuánto te deben o debes por un movimiento concreto. */
export const MovementImpact: React.FC<MovementImpactProps> = ({ movement, userId, isSingleMemberGroup = false }) => {
  if (!userId || isSingleMemberGroup) return null;

  if (movement.type === 'INCOME') return null;

  const net = calculateMovementImpact(movement, userId);

  if (net === 0) {
    const isPersonal =
      movement.shares.length === 1 &&
      movement.shares[0].userId === movement.paidById &&
      movement.paidById === userId;

    if (isPersonal) return null;
    return <span className="text-xs text-slate-400 font-medium">Sin saldo pendiente</span>;
  }

  return net > 0 ? (
    <span className="text-xs text-emerald-600 font-semibold">Te deben {formatCurrency(net)}</span>
  ) : (
    <span className="text-xs text-rose-600 font-semibold">Debes {formatCurrency(-net)}</span>
  );
};
