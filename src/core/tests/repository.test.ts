import test from 'node:test';
import assert from 'node:assert/strict';
import { MockRepository } from '../../data/mockRepository.ts';

test('MockRepository: añadir miembro provisional y recalcular reparto igualitario', async () => {
  const repo = new MockRepository();
  const group = await repo.getGroupById('group-1');
  assert.ok(group);
  const initialCount = group.members.length;

  const updatedGroup = await repo.addMemberToGroup(group.id, 'Laura Gómez');
  assert.equal(updatedGroup.members.length, initialCount + 1);

  const newMember = updatedGroup.members[updatedGroup.members.length - 1];
  const user = await repo.getUserById(newMember.userId);
  assert.ok(user);
  assert.equal(user.isProvisional, true);
  assert.match(user.name, /Laura Gómez/);
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
