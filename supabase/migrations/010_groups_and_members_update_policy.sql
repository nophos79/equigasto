-- =====================================================================
-- EquiGasto · Migración 010: Políticas RLS de actualización en groups y group_members
-- Solo el creador del grupo (created_by) o un administrador global pueden modificar
-- los datos del grupo (nombre, descripción, icono, modalidad de reparto) y los porcentajes.
-- =====================================================================

-- 1. Política UPDATE en public.groups: Solo el creador o un admin
drop policy if exists "groups_update_policy" on public.groups;
create policy "groups_update_policy" on public.groups
for update using (
  created_by = public.current_profile_id()
  or public.is_current_user_admin()
)
with check (
  created_by = public.current_profile_id()
  or public.is_current_user_admin()
);

-- 2. Política UPDATE en public.group_members: Solo el creador del grupo o un admin
drop policy if exists "members_update_policy" on public.group_members;
create policy "members_update_policy" on public.group_members
for update using (
  exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
      and (g.created_by = public.current_profile_id() or public.is_current_user_admin())
  )
)
with check (
  exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
      and (g.created_by = public.current_profile_id() or public.is_current_user_admin())
  )
);

-- 3. Asegurar permisos GRANT a usuarios autenticados
grant update on public.groups to authenticated;
grant update on public.group_members to authenticated;

