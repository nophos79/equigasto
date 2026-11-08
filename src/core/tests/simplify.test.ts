import test from 'node:test';
import assert from 'node:assert/strict';
import { simplifyDebts } from '../simplify.ts';
import type { MemberBalance } from '../types.ts';

test('simplifyDebts: minimiza transferencias entre deudores y acreedores', () => {
  // Caso de especificación:
  // Ana: net +120 €
  // Luis: net -60 €
  // Marta: net -60 €
  const balances: MemberBalance[] = [
    { userId: 'ana', paidCents: 20000, shouldPayCents: 8000, netBalanceCents: 12000 },
    { userId: 'luis', paidCents: 4000, shouldPayCents: 10000, netBalanceCents: -6000 },
    { userId: 'marta', paidCents: 0, shouldPayCents: 6000, netBalanceCents: -6000 },
  ];

  const debts = simplifyDebts(balances);

  assert.equal(debts.length, 2);
  // Luis debe pagar 60 € a Ana
  // Marta debe pagar 60 € a Ana
  const totalSettled = debts.reduce((sum, d) => sum + d.amountCents, 0);
  assert.equal(totalSettled, 12000);

  for (const d of debts) {
    assert.equal(d.toUserId, 'ana');
    assert.equal(d.amountCents, 6000);
    assert.ok(d.fromUserId === 'luis' || d.fromUserId === 'marta');
  }
});
