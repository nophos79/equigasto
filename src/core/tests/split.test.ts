import test from 'node:test';
import assert from 'node:assert/strict';
import { splitByPercentages, splitEquallyWithMembers } from '../split.ts';

test('splitByPercentages: reparto exacto 50/30/20 sin residuo', () => {
  const configs = [
    { userId: 'u1', percentage: 50 },
    { userId: 'u2', percentage: 30 },
    { userId: 'u3', percentage: 20 },
  ];
  const results = splitByPercentages(6000, configs); // 60,00 €
  assert.equal(results.find((r) => r.userId === 'u1')?.amountCents, 3000); // 30 €
  assert.equal(results.find((r) => r.userId === 'u2')?.amountCents, 1800); // 18 €
  assert.equal(results.find((r) => r.userId === 'u3')?.amountCents, 1200); // 12 €

  const sum = results.reduce((acc, r) => acc + r.amountCents, 0);
  assert.equal(sum, 6000);
});

test('splitByPercentages: reparto determinista con residuos (Método del Resto Mayor)', () => {
  // 10,00 € (1000 céntimos) entre 3 personas: 33.33%, 33.33%, 33.34%
  const configs = [
    { userId: 'ana', percentage: 33.33 },
    { userId: 'luis', percentage: 33.33 },
    { userId: 'marta', percentage: 33.34 },
  ];
  const results = splitByPercentages(1000, configs);

  const sum = results.reduce((acc, r) => acc + r.amountCents, 0);
  // Garantía matemática: la suma coincide exactamente al céntimo
  assert.equal(sum, 1000);

  // Marta (33.34%) tiene el mayor resto decimal (333.4), por lo que recibe 334 céntimos
  const martaShare = results.find((r) => r.userId === 'marta')!;
  assert.equal(martaShare.amountCents, 334);
});

test('splitByPercentages: caso extremo de 1 céntimo total entre 3 miembros', () => {
  const configs = [
    { userId: 'a', percentage: 50 },
    { userId: 'b', percentage: 25 },
    { userId: 'c', percentage: 25 },
  ];
  const results = splitByPercentages(1, configs);
  const sum = results.reduce((acc, r) => acc + r.amountCents, 0);
  assert.equal(sum, 1);
  // El de 50% recibe el céntimo único
  assert.equal(results.find((r) => r.userId === 'a')?.amountCents, 1);
  assert.equal(results.find((r) => r.userId === 'b')?.amountCents, 0);
  assert.equal(results.find((r) => r.userId === 'c')?.amountCents, 0);
});

test('splitEquallyWithMembers: reparto igualitario determinista', () => {
  const members = ['u1', 'u2', 'u3'];
  const results = splitEquallyWithMembers(10000, members); // 100 €
  assert.equal(results[0].amountCents, 3334);
  assert.equal(results[1].amountCents, 3333);
  assert.equal(results[2].amountCents, 3333);

  const sum = results.reduce((acc, r) => acc + r.amountCents, 0);
  assert.equal(sum, 10000);
});
