import test from 'node:test';
import assert from 'node:assert/strict';
import { MockRepository } from '../../data/mockRepository.ts';

test('MockRepository: añadir miembro por correo (usuario registrado) y recalcular reparto', async () => {
  const repo = new MockRepository();
  const group = await repo.getGroupById('group-3');
  assert.ok(group);
  const initialCount = group.members.length;
  assert.equal(group.members.some((m) => m.userId === 'user-3'), false);

  const updated = await repo.addMemberByEmail(group.id, 'MARTA.sanchez@example.com');
  assert.equal(updated.members.length, initialCount + 1);
  assert.ok(updated.members.some((m) => m.userId === 'user-3'));
});

test('MockRepository: rechaza correos no registrados y miembros ya existentes', async () => {
  const repo = new MockRepository();
  await assert.rejects(() => repo.addMemberByEmail('group-3', 'nadie@example.com'), /registrado y verificado/);
  await assert.rejects(() => repo.addMemberByEmail('group-3', 'luis.gomez@example.com'), /ya es miembro/);
});
test('MockRepository: actualizar configuración de grupo y porcentajes', async () => {
  const repo = new MockRepository();
  const group = await repo.getGroupById('group-2');
  assert.ok(group);

  const updated = await repo.updateGroup(group.id, {
    name: 'Piso Lavapiés (Renovado)',
    defaultSplitMode: 'PERCENTAGE',
  });

  assert.equal(updated.name, 'Piso Lavapiés (Renovado)');
  assert.equal(updated.defaultSplitMode, 'PERCENTAGE');
});

test('MockRepository: actualizar movimiento y recalcular balances', async () => {
  const repo = new MockRepository();
  const movements = await repo.getMovements('group-1');
  assert.ok(movements.length > 0);

  const firstMov = movements[0];
  const originalAmount = firstMov.amountCents;

  const updatedMov = await repo.updateMovement(firstMov.id, {
    concept: 'Cena en Barrio Alto (Actualizado con propina)',
    amountCents: originalAmount + 1000, // +10 €
  });

  assert.equal(updatedMov.amountCents, originalAmount + 1000);
  assert.match(updatedMov.concept, /Actualizado/);

  // Verificar que el balance neto total del grupo sigue siendo exactamente 0 céntimos
  const balances = await repo.getGroupBalances('group-1');
  const sumNet = balances.reduce((sum, b) => sum + b.netBalanceCents, 0);
  assert.equal(sumNet, 0);
});
