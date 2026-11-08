import type { Movement, MemberBalance } from './types.ts';

/**
 * Calcula los balances económicos netos de todos los miembros de un grupo
 * basándose en todos sus movimientos (gastos compartidos, individuales, préstamos y liquidaciones).
 * 
 * Regla de oro: La suma de los balances netos de un grupo es SIEMPRE exactamente 0 céntimos.
 */
export function calculateGroupBalances(memberUserIds: string[], movements: Movement[]): MemberBalance[] {
  const map = new Map<string, { paidCents: number; shouldPayCents: number }>();

  // Inicializar todos los miembros
  memberUserIds.forEach(id => {
    map.set(id, { paidCents: 0, shouldPayCents: 0 });
  });

  for (const mov of movements) {
    // 1. Quien adelanta o paga dinero
    const payer = map.get(mov.paidById);
    if (payer) {
      payer.paidCents += mov.amountCents;
    }

    // 2. Imputar quién asume o debe ese dinero según el tipo
    switch (mov.type) {
      case 'SHARED_EXPENSE': {
        // Cada miembro asume su cuota según shares
        for (const share of mov.shares) {
          const participant = map.get(share.userId);
          if (participant) {
            participant.shouldPayCents += share.amountCents;
          }
        }
        break;
      }

      case 'INDIVIDUAL_EXPENSE':
      case 'LOAN': {
        // El 100% lo asume el receptor
        if (mov.recipientId) {
          const recipient = map.get(mov.recipientId);
          if (recipient) {
            recipient.shouldPayCents += mov.amountCents;
          }
        }
        break;
      }

      case 'SETTLEMENT': {
        // En una liquidación, quien recibe el dinero reduce su crédito acumulado
        // Tratado de forma unificada: el receptor 'asume' la devolución recibida
        if (mov.recipientId) {
          const recipient = map.get(mov.recipientId);
          if (recipient) {
            recipient.shouldPayCents += mov.amountCents;
          }
        }
        break;
      }
    }
  }

  // Generar resultado con balances netos
  const balances: MemberBalance[] = [];
  map.forEach((data, userId) => {
    balances.push({
      userId,
      paidCents: data.paidCents,
      shouldPayCents: data.shouldPayCents,
      netBalanceCents: data.paidCents - data.shouldPayCents,
    });
  });

  return balances;
}
