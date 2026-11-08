import type { MemberBalance, SimplifiedDebt } from './types.ts';

/**
 * Algoritmo de Simplificación de Deudas.
 * Minimiza el número de transferencias necesarias para liquidar todas las posiciones
 * netas de los miembros de un grupo.
 * 
 * Basado en emparejamiento voraz (Greedy settlement) con céntimos enteros:
 * - Separa acreedores (netBalance > 0) y deudores (netBalance < 0).
 * - Liquida recursivamente la menor deuda/crédito entre el mayor deudor y el mayor acreedor.
 */
export function simplifyDebts(balances: MemberBalance[]): SimplifiedDebt[] {
  const creditors: { userId: string; amountCents: number }[] = [];
  const debtors: { userId: string; amountCents: number }[] = [];

  for (const b of balances) {
    if (b.netBalanceCents > 0) {
      creditors.push({ userId: b.userId, amountCents: b.netBalanceCents });
    } else if (b.netBalanceCents < 0) {
      debtors.push({ userId: b.userId, amountCents: Math.abs(b.netBalanceCents) });
    }
  }

  // Ordenar de mayor a menor para optimizar transferencias
  creditors.sort((a, b) => b.amountCents - a.amountCents);
  debtors.sort((a, b) => b.amountCents - a.amountCents);

  const debts: SimplifiedDebt[] = [];

  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const settledCents = Math.min(creditor.amountCents, debtor.amountCents);

    if (settledCents > 0) {
      debts.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountCents: settledCents,
      });
    }

    creditor.amountCents -= settledCents;
    debtor.amountCents -= settledCents;

    if (creditor.amountCents === 0) cIdx++;
    if (debtor.amountCents === 0) dIdx++;
  }

  return debts;
}
