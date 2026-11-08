import type { SimplifiedDebt } from './types.ts';
import { formatCurrency } from './money.ts';

export interface SettlementValidationResult {
  isValid: boolean;
  errorMessage?: string;
  createsReverseDebt: boolean;
  excessCents: number;
  currentDebtCents: number;
  warningMessage?: string;
}

/**
 * Valida una liquidación de deuda antes de registrarla para evitar
 * incoherencias contables o deudas inversas no intencionadas (Sección 8).
 */
export function validateSettlement(
  payerId: string,
  recipientId: string,
  amountCents: number,
  currentDebts: SimplifiedDebt[]
): SettlementValidationResult {
  if (payerId === recipientId) {
    return {
      isValid: false,
      errorMessage: 'El pagador y el receptor de la liquidación no pueden ser la misma persona.',
      createsReverseDebt: false,
      excessCents: 0,
      currentDebtCents: 0,
    };
  }

  if (amountCents <= 0) {
    return {
      isValid: false,
      errorMessage: 'El importe de la liquidación debe ser superior a 0,00 €.',
      createsReverseDebt: false,
      excessCents: 0,
      currentDebtCents: 0,
    };
  }

  // Buscar deuda simplificada existente de payerId hacia recipientId
  const directDebt = currentDebts.find(
    (d) => d.fromUserId === payerId && d.toUserId === recipientId
  );

  const currentDebtCents = directDebt ? directDebt.amountCents : 0;

  if (currentDebtCents === 0) {
    return {
      isValid: true,
      createsReverseDebt: true,
      excessCents: amountCents,
      currentDebtCents: 0,
      warningMessage: `Atención: Según el cálculo actual, el pagador no tiene ninguna deuda pendiente directa hacia este receptor. Esta operación creará una deuda inversa de ${formatCurrency(amountCents)}.`,
    };
  }

  if (amountCents > currentDebtCents) {
    const excessCents = amountCents - currentDebtCents;
    return {
      isValid: true,
      createsReverseDebt: true,
      excessCents,
      currentDebtCents,
      warningMessage: `Atención: La deuda pendiente es de ${formatCurrency(currentDebtCents)}. Este importe la supera en ${formatCurrency(excessCents)}, lo que creará una deuda inversa.`,
    };
  }

  return {
    isValid: true,
    createsReverseDebt: false,
    excessCents: 0,
    currentDebtCents,
  };
}
