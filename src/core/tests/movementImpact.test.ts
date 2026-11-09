import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMovementImpact } from '../balance.ts';
import type { Movement } from '../types.ts';

const base = { groupId: 'g', concept: 'x', date: '2026-01-01', createdAt: '2026-01-01T00:00:00Z' };

test('impacto: gasto compartido, el pagador recibe lo que adelanta menos su parte', () => {
  const mov: Movement = {
    ...base, id: '1', type: 'SHARED_EXPENSE', amountCents: 9000, paidById: 'a', splitMode: 'EQUAL',
    shares: [
      { userId: 'a', amountCents: 3000 },
      { userId: 'b', amountCents: 3000 },
      { userId: 'c', amountCents: 3000 },
    ],
  };
  assert.equal(calculateMovementImpact(mov, 'a'), 6000);
  assert.equal(calculateMovementImpact(mov, 'b'), -3000);
  assert.equal(calculateMovementImpact(mov, 'z'), 0);
});

test('impacto: préstamo y adelanto individual', () => {
  const mov: Movement = {
    ...base, id: '2', type: 'LOAN', amountCents: 5000, paidById: 'a', recipientId: 'b',
    shares: [{ userId: 'b', amountCents: 5000 }],
  };
  assert.equal(calculateMovementImpact(mov, 'a'), 5000);
  assert.equal(calculateMovementImpact(mov, 'b'), -5000);
});

test('impacto: la suma de impactos de un movimiento es 0', () => {
  const mov: Movement = {
    ...base, id: '3', type: 'SHARED_EXPENSE', amountCents: 10001, paidById: 'b', splitMode: 'PERCENTAGE',
    shares: [
      { userId: 'a', amountCents: 5001 },
      { userId: 'b', amountCents: 3000 },
      { userId: 'c', amountCents: 2000 },
    ],
  };
  const total = ['a', 'b', 'c'].reduce((acc, u) => acc + calculateMovementImpact(mov, u), 0);
  assert.equal(total, 0);
});
