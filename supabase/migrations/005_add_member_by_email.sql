-- =====================================================================
-- EquiGasto · 005 · Añadir miembros por correo (solo usuarios verificados)
-- Un miembro del grupo puede añadir a otro usuario SOLO si su correo
-- pertenece a una cuenta registrada y con el email verificado.
-- Función SECURITY DEFINER: la RLS impide ver perfiles ajenos, y así
-- no se exponen perfiles ni se pueden listar correos registrados.
-- Idempotente. Ejecutar en Supabase -> SQL Editor.
-- =====================================================================

create or replace function public.add_member_by_email(
  p_group_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid;
  v_mode text;
  v_count integer;
begin
  if public.current_profile_id() is null then
    raise exception 'Usuario no autenticado';
  end if;
  if not public.is_member_of_group(p_group_id) then
    raise exception 'No perteneces a este grupo';
  end if;

  select p.id into v_profile
  from public.profiles p
  join auth.users u on u.id = p.auth_user_id
  where lower(u.email) = lower(trim(p_email))
    and u.email_confirmed_at is not null
    and p.is_provisional = false
  limit 1;

  if v_profile is null then
    raise exception 'No existe ningún usuario registrado y verificado con ese correo';
  end if;

  if exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = v_profile
  ) then
    raise exception 'Ese usuario ya es miembro del grupo';
  end if;

  insert into public.group_members (group_id, user_id, role, percentage)
  values (p_group_id, v_profile, 'MEMBER', 0);

  -- En reparto igualitario, recalcular porcentajes a partes iguales
  select default_split_mode into v_mode from public.groups where id = p_group_id;
  if v_mode = 'EQUAL' then
    select count(*) into v_count from public.group_members where group_id = p_group_id;
    update public.group_members
      set percentage = round(100.0 / v_count, 2)
      where group_id = p_group_id;
  end if;

  return v_profile;
end;
$$;

revoke execute on function public.add_member_by_email(uuid, text) from public, anon;
grant execute on function public.add_member_by_email(uuid, text) to authenticated;

-- Comprobación: debe devolver 1 fila
select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name = 'add_member_by_email';
