import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSettlement } from '../settlement.ts';
import type { SimplifiedDebt } from '../types.ts';

test('validateSettlement: rechaza liquidación si el pagador y receptor son el mismo', () => {
  const result = validateSettlement('u1', 'u1', 5000, []);
  assert.equal(result.isValid, false);
  assert.match(result.errorMessage || '', /no pueden ser la misma persona/);
});

test('validateSettlement: rechaza importe no positivo', () => {
  const result = validateSettlement('u1', 'u2', 0, []);
  assert.equal(result.isValid, false);
  assert.match(result.errorMessage || '', /superior a 0/);
});

test('validateSettlement: liquidación exacta según deuda existente', () => {
  const debts: SimplifiedDebt[] = [
    { fromUserId: 'luis', toUserId: 'ana', amountCents: 6000 },
  ];
  const result = validateSettlement('luis', 'ana', 6000, debts);
  assert.equal(result.isValid, true);
  assert.equal(result.createsReverseDebt, false);
  assert.equal(result.excessCents, 0);
  assert.equal(result.currentDebtCents, 6000);
});

test('validateSettlement: detecta sobrepago y deuda inversa', () => {
  const debts: SimplifiedDebt[] = [
    { fromUserId: 'luis', toUserId: 'ana', amountCents: 6000 },
  ];
  // Luis intenta devolver 100 € cuando solo debe 60 €
  const result = validateSettlement('luis', 'ana', 10000, debts);
  assert.equal(result.isValid, true);
  assert.equal(result.createsReverseDebt, true);
  assert.equal(result.excessCents, 4000);
  assert.match(result.warningMessage || '', /creará una deuda inversa/);
});

test('validateSettlement: detecta liquidación sin deuda previa', () => {
  const debts: SimplifiedDebt[] = [];
  const result = validateSettlement('luis', 'ana', 2500, debts);
  assert.equal(result.isValid, true);
  assert.equal(result.createsReverseDebt, true);
  assert.equal(result.excessCents, 2500);
  assert.equal(result.currentDebtCents, 0);
});
