-- =====================================================================
-- EquiGasto · Migración 010: Políticas RLS de actualización en groups y group_members
-- Permite que los miembros, creador o administradores puedan editar los datos del grupo
-- (nombre, descripción, icono, modalidad de reparto) y actualizar porcentajes de miembros.
-- =====================================================================

-- 1. Política UPDATE en public.groups
drop policy if exists "groups_update_policy" on public.groups;
create policy "groups_update_policy" on public.groups
for update using (
  public.is_member_of_group(id)
  or created_by = public.current_profile_id()
  or public.is_current_user_admin()
)
with check (
  public.is_member_of_group(id)
  or created_by = public.current_profile_id()
  or public.is_current_user_admin()
);

-- 2. Política UPDATE en public.group_members
drop policy if exists "members_update_policy" on public.group_members;
create policy "members_update_policy" on public.group_members
for update using (
  public.is_member_of_group(group_id)
  or exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
      and (g.created_by = public.current_profile_id() or public.is_current_user_admin())
  )
)
with check (
  public.is_member_of_group(group_id)
  or exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
      and (g.created_by = public.current_profile_id() or public.is_current_user_admin())
  )
);

-- 3. Asegurar permisos GRANT a usuarios autenticados
grant update on public.groups to authenticated;
grant update on public.group_members to authenticated;
