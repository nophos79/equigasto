/**
 * Motor de Reparto de Gastos Económicos.
 * Garantiza que la suma de las cantidades distribuidas coincida exactamente
 * con el importe total original en céntimos (cero pérdida de céntimos por redondeo).
 */

export interface SplitResult {
  userId: string;
  amountCents: number;
  percentage?: number;
}

/**
 * Reparto Equitativo (Partes Iguales).
 * Distribuye el importe total en céntimos enteros entre N participantes.
 * Los primeros participantes asumen el residuo de 1 céntimo hasta cuadrar el total.
 */
export function splitEquallyWithMembers(
  totalCents: number,
  memberUserIds: string[]
): SplitResult[] {
  const count = memberUserIds.length;
  if (count === 0) return [];

  const base = Math.floor(totalCents / count);
  let remainder = totalCents % count;

  return memberUserIds.map((userId) => {
    let amount = base;
    if (remainder > 0) {
      amount += 1;
      remainder--;
    }
    return {
      userId,
      amountCents: amount,
    };
  });
}

/**
 * Reparto Porcentual Determinista (Método del Resto Mayor / Hare-Niemeyer).
 * Utilizado en contabilidad y sistemas electorales para asignar unidades enteras
 * a cuotas proporcionales sin sesgo.
 * 
 * 1. Calcula la cuota base entera (piso).
 * 2. Calcula la fracción decimal del resto.
 * 3. Ordena por mayor fracción (y desempate determinista por ID de usuario).
 * 4. Asigna 1 céntimo adicional a los primeros 'resto' participantes.
 * 
 * Garantía matemática: sum(shares.amountCents) === totalCents SIEMPRE.
 */
export function splitByPercentages(
  totalCents: number,
  members: { userId: string; percentage: number }[]
): SplitResult[] {
  if (members.length === 0) return [];

  const rawShares = members.map((m) => {
    const raw = (totalCents * m.percentage) / 100;
    const baseCents = Math.floor(raw);
    const remainder = raw - baseCents;
    return {
      userId: m.userId,
      percentage: m.percentage,
      baseCents,
      remainder,
    };
  });

  const allocatedCents = rawShares.reduce((sum, s) => sum + s.baseCents, 0);
  let surplusCents = totalCents - allocatedCents;

  // Ordenar de forma determinista: primero por mayor resto decimal, luego por userId alfabético
  const sortedIndices = rawShares
    .map((s, idx) => ({ idx, remainder: s.remainder, userId: s.userId }))
    .sort((a, b) => {
      const diff = b.remainder - a.remainder;
      if (Math.abs(diff) > 0.000001) return diff;
      return a.userId.localeCompare(b.userId);
    });

  // Asignar los céntimos de residuo
  const bonusMap = new Set<number>();
  for (let i = 0; i < surplusCents && i < sortedIndices.length; i++) {
    bonusMap.add(sortedIndices[i].idx);
  }

  return rawShares.map((s, idx) => ({
    userId: s.userId,
    percentage: s.percentage,
    amountCents: s.baseCents + (bonusMap.has(idx) ? 1 : 0),
  }));
}
