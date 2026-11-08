import test from 'node:test';
import assert from 'node:assert/strict';
import { simplifyDebts } from '../simplify.ts';
import type { MemberBalance } from '../types.ts';

test('simplifyDebts: caso de la especificación (Ana +120€, Luis -60€, Marta -60€)', () => {
  const balances: MemberBalance[] = [
    { userId: 'ana', paidCents: 20000, shouldPayCents: 8000, netBalanceCents: 12000 },
    { userId: 'luis', paidCents: 4000, shouldPayCents: 10000, netBalanceCents: -6000 },
    { userId: 'marta', paidCents: 0, shouldPayCents: 6000, netBalanceCents: -6000 },
  ];

  const debts = simplifyDebts(balances);

  assert.equal(debts.length, 2);
  const totalSettled = debts.reduce((sum, d) => sum + d.amountCents, 0);
  assert.equal(totalSettled, 12000);

  for (const d of debts) {
    assert.equal(d.toUserId, 'ana');
    assert.equal(d.amountCents, 6000);
    assert.ok(d.fromUserId === 'luis' || d.fromUserId === 'marta');
  }
});

test('simplifyDebts: cadena transitiva A -> B -> C -> D colapsa a 1 transferencia', () => {
  // A tiene net -30 €
  // B tiene net 0 € (lo que le deben es igual a lo que debe)
  // C tiene net 0 €
  // D tiene net +30 €
  // En vez de 3 transferencias en cadena, la posición neta se salda con 1 única transferencia: A paga 30 € a D.
  const balances: MemberBalance[] = [
    { userId: 'A', paidCents: 0, shouldPayCents: 3000, netBalanceCents: -3000 },
    { userId: 'B', paidCents: 3000, shouldPayCents: 3000, netBalanceCents: 0 },
    { userId: 'C', paidCents: 3000, shouldPayCents: 3000, netBalanceCents: 0 },
    { userId: 'D', paidCents: 3000, shouldPayCents: 0, netBalanceCents: 3000 },
  ];

  const debts = simplifyDebts(balances);
  assert.equal(debts.length, 1);
  assert.equal(debts[0].fromUserId, 'A');
  assert.equal(debts[0].toUserId, 'D');
  assert.equal(debts[0].amountCents, 3000);
});

test('simplifyDebts: deudas circulares saldadas dan 0 transferencias', () => {
  // Cuando todos están equilibrados (netBalance = 0)
  const balances: MemberBalance[] = [
    { userId: 'A', paidCents: 5000, shouldPayCents: 5000, netBalanceCents: 0 },
    { userId: 'B', paidCents: 5000, shouldPayCents: 5000, netBalanceCents: 0 },
    { userId: 'C', paidCents: 5000, shouldPayCents: 5000, netBalanceCents: 0 },
  ];

  const debts = simplifyDebts(balances);
  assert.equal(debts.length, 0);
});
