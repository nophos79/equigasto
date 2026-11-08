import test from 'node:test';
import assert from 'node:assert/strict';
import { eurosToCents, centsToEuros, formatCurrency, splitEqually } from '../money.ts';

test('eurosToCents: conversiones exactas sin errores de coma flotante', () => {
  assert.equal(eurosToCents(19.99), 1999);
  assert.equal(eurosToCents('19,99'), 1999);
  assert.equal(eurosToCents('120.50'), 12050);
  assert.equal(eurosToCents('0,01'), 1);
  assert.equal(eurosToCents(0), 0);
  assert.equal(eurosToCents(120), 12000);
});

test('centsToEuros: conversión a euros', () => {
  assert.equal(centsToEuros(1999), 19.99);
  assert.equal(centsToEuros(12000), 120);
  assert.equal(centsToEuros(1), 0.01);
});

test('splitEqually: la suma de partes cuadra exactamente el total al céntimo', () => {
  // Caso 1: 100 € (10000 céntimos) entre 3 personas
  const splits100 = splitEqually(10000, 3);
  assert.deepEqual(splits100, [3334, 3333, 3333]);
  const sum100 = splits100.reduce((a, b) => a + b, 0);
  assert.equal(sum100, 10000);

  // Caso 2: 10 € (1000 céntimos) entre 3 personas
  const splits10 = splitEqually(1000, 3);
  assert.deepEqual(splits10, [334, 333, 333]);
  assert.equal(splits10.reduce((a, b) => a + b, 0), 1000);

  // Caso 3: 7 céntimos entre 4 personas
  const splits7 = splitEqually(7, 4);
  assert.deepEqual(splits7, [2, 2, 2, 1]);
  assert.equal(splits7.reduce((a, b) => a + b, 0), 7);
});

test('formatCurrency: formato de moneda en euros', () => {
  const formatted = formatCurrency(12050);
  assert.match(formatted, /120,50/);
  assert.match(formatted, /€/);

  const formattedSigned = formatCurrency(12050, { showSign: true });
  assert.ok(formattedSigned.startsWith('+'));
});
