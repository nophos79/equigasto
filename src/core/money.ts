/**
 * Utilidades monetarias para cálculos económicos exactos en céntimos enteros.
 * Ninguna operación financiera debe usar decimales de coma flotante.
 */

/**
 * Convierte euros a céntimos enteros de forma segura (evitando 19.99 * 100 = 1998.999999).
 */
export function eurosToCents(euros: number | string): number {
  if (typeof euros === 'string') {
    // Normalizar coma a punto
    const normalized = euros.trim().replace(',', '.');
    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  return Math.round(euros * 100);
}

/**
 * Convierte céntimos a euros en coma flotante únicamente para visualización o inputs.
 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/**
 * Formatea una cantidad en céntimos como cadena de moneda en euros (€).
 * Ejemplo: 12050 -> "120,50 €"
 * Con signo explícito si se requiere (+120,50 € o -120,50 €).
 */
export function formatCurrency(
  cents: number,
  options: { showSign?: boolean; absolute?: boolean } = {}
): string {
  const value = options.absolute ? Math.abs(cents) : cents;
  const euros = value / 100;
  
  const formatted = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);

  if (options.showSign && cents > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Divide equitativamente un importe en céntimos entre N participantes,
 * resolviendo el residuo de forma determinista para que sume exactamente el total.
 */
export function splitEqually(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  let remainder = totalCents % count;

  const shares: number[] = [];
  for (let i = 0; i < count; i++) {
    // Los primeros participantes asumen 1 céntimo adicional del residuo
    if (remainder > 0) {
      shares.push(base + 1);
      remainder--;
    } else {
      shares.push(base);
    }
  }
  return shares;
}

/**
 * Formatea un porcentaje garantizando siempre 2 decimales y coma como separador decimal.
 * Ejemplo: 1.8 -> "1,80 %" o con includeSymbol=false -> "1,80"
 */
export function formatPercentage(val: number, includeSymbol = true): string {
  const num = Number(val) || 0;
  const formatted = num.toFixed(2).replace('.', ',');
  return includeSymbol ? `${formatted}%` : formatted;
}
