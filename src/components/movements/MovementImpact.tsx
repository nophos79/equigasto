import React from 'react';
import type { Movement } from '../../core/types';
import { calculateMovementImpact } from '../../core/balance';
import { formatCurrency } from '../../core/money';

interface MovementImpactProps {
  movement: Movement;
  userId?: string;
}

/** Cuánto te deben o debes por un movimiento concreto. */
export const MovementImpact: React.FC<MovementImpactProps> = ({ movement, userId }) => {
  if (!userId) return null;

  if (movement.type === 'INCOME') {
    return <span className="text-xs text-emerald-600 font-semibold">+ {formatCurrency(movement.amountCents)} (Ingreso)</span>;
  }

  const net = calculateMovementImpact(movement, userId);

  if (net === 0) {
    const isPersonal =
      movement.shares.length === 1 &&
      movement.shares[0].userId === movement.paidById &&
      movement.paidById === userId;

    if (isPersonal) {
      return <span className="text-xs text-slate-500 font-semibold">Gasto personal</span>;
    }
    return <span className="text-xs text-slate-400 font-medium">Sin saldo pendiente</span>;
  }

  return net > 0 ? (
    <span className="text-xs text-emerald-600 font-semibold">Te deben {formatCurrency(net)}</span>
  ) : (
    <span className="text-xs text-rose-600 font-semibold">Debes {formatCurrency(-net)}</span>
  );
};
