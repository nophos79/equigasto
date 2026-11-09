-- =====================================================================
-- EquiGasto · 004 · Eliminar grupos
-- Faltaba la política DELETE en groups, por eso no se podían borrar.
-- Solo el creador del grupo puede eliminarlo. Idempotente.
-- =====================================================================

drop policy if exists "groups_delete_policy" on public.groups;
create policy "groups_delete_policy" on public.groups
for delete using (
  created_by = public.current_profile_id()
);

-- Comprobación: debe devolver 1 fila
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'groups' and cmd = 'DELETE';
