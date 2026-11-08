import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGroupBalances } from '../balance.ts';
import type { Movement } from '../types.ts';

test('calculateGroupBalances: Gasto compartido igualitario (Ejemplo de la especificación)', () => {
  // Ana, Luis, Marta. Ana paga 120 €.
  // Ana asume 40 €, Luis 40 €, Marta 40 €.
  // Ana net: +80 € (8000 cents). Luis net: -40 € (-4000 cents). Marta net: -40 € (-4000 cents).
  const members = ['ana', 'luis', 'marta'];
  const movements: Movement[] = [
    {
      id: 'mov-1',
      groupId: 'grp-1',
      type: 'SHARED_EXPENSE',
      concept: 'Cena 120€',
      amountCents: 12000,
      paidById: 'ana',
      date: '2026-05-10T20:00:00Z',
      createdAt: '2026-05-10T20:00:00Z',
      shares: [
        { userId: 'ana', amountCents: 4000 },
        { userId: 'luis', amountCents: 4000 },
        { userId: 'marta', amountCents: 4000 },
      ],
    },
  ];

  const balances = calculateGroupBalances(members, movements);
  const anaB = balances.find(b => b.userId === 'ana')!;
  const luisB = balances.find(b => b.userId === 'luis')!;
  const martaB = balances.find(b => b.userId === 'marta')!;

  assert.equal(anaB.paidCents, 12000);
  assert.equal(anaB.shouldPayCents, 4000);
  assert.equal(anaB.netBalanceCents, 8000);

  assert.equal(luisB.paidCents, 0);
  assert.equal(luisB.shouldPayCents, 4000);
  assert.equal(luisB.netBalanceCents, -4000);

  assert.equal(martaB.paidCents, 0);
  assert.equal(martaB.shouldPayCents, 4000);
  assert.equal(martaB.netBalanceCents, -4000);

  // Regla de oro: Suma de saldos netos es SIEMPRE 0
  const sumNet = balances.reduce((sum, b) => sum + b.netBalanceCents, 0);
  assert.equal(sumNet, 0);
});

test('calculateGroupBalances: Unificación de préstamo, gasto individual y liquidación', () => {
  // Ana presta 120 € a Luis.
  // Luego Luis devuelve 100 € a Ana mediante una liquidación.
  const members = ['ana', 'luis'];
  const movements: Movement[] = [
    {
      id: 'mov-loan',
      groupId: 'grp-1',
      type: 'LOAN',
      concept: 'Préstamo',
      amountCents: 12000,
      paidById: 'ana',
      recipientId: 'luis',
      date: '2026-05-10T20:00:00Z',
      createdAt: '2026-05-10T20:00:00Z',
      shares: [{ userId: 'luis', amountCents: 12000 }],
    },
    {
      id: 'mov-settle',
      groupId: 'grp-1',
      type: 'SETTLEMENT',
      concept: 'Devolución parcial Bizum',
      amountCents: 10000,
      paidById: 'luis',
      recipientId: 'ana',
      date: '2026-05-11T10:00:00Z',
      createdAt: '2026-05-11T10:00:00Z',
      shares: [],
    },
  ];

  const balances = calculateGroupBalances(members, movements);
  const anaB = balances.find(b => b.userId === 'ana')!;
  const luisB = balances.find(b => b.userId === 'luis')!;

  // Deuda pendiente neta: Ana debe cobrar 20 €, Luis debe pagar 20 €
  assert.equal(anaB.netBalanceCents, 2000);
  assert.equal(luisB.netBalanceCents, -2000);

  const sumNet = balances.reduce((sum, b) => sum + b.netBalanceCents, 0);
  assert.equal(sumNet, 0);
});
