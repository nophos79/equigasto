-- =====================================================================
-- EquiGasto · Migración 008: Aprobación de cuentas por Administrador
-- Permite que nuevos usuarios se registren pero queden pendientes de aprobación (is_approved = false).
-- Solo los administradores (is_admin = true) pueden ver la lista de pendientes y aprobar o rechazar solicitudes.
-- =====================================================================

-- 1. Añadir columnas de aprobación y rol admin a la tabla profiles
alter table public.profiles add column if not exists is_approved boolean not null default false;
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 2. Asegurar que todos los perfiles actuales queden aprobados
update public.profiles set is_approved = true;

-- 3. Marcar al administrador actual (por email o el primer usuario registrado)
update public.profiles
set is_admin = true, is_approved = true
where lower(email) = 'barrosod@gmail.com'
   or id in (select id from public.profiles order by created_at asc limit 1);

-- 4. Helpers de verificación de estado
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where auth_user_id = auth.uid() limit 1),
    false
  );
$$;

create or replace function public.is_current_user_approved()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_approved from public.profiles where auth_user_id = auth.uid() limit 1),
    false
  );
$$;

-- 5. Actualizar Trigger para nuevos usuarios
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_first boolean;
  v_is_admin boolean;
begin
  -- Comprobar si no hay perfiles previos
  select not exists (select 1 from public.profiles) into v_is_first;
  
  -- Es admin si es el primer usuario o su email coincide con el administrador definido
  v_is_admin := v_is_first or lower(coalesce(new.email, '')) = 'barrosod@gmail.com';

  insert into public.profiles (auth_user_id, name, email, avatar_url, is_approved, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    v_is_admin,  -- Si es admin se aprueba automáticamente; si no, queda pendiente (false)
    v_is_admin
  );
  return new;
end;
$$;

-- 6. Actualizar políticas RLS de profiles
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy" on public.profiles
for select using (
  auth_user_id = auth.uid()
  or public.is_current_user_admin()
  or (public.is_current_user_approved() and public.shares_group_with(id))
);

-- 7. Actualizar políticas RLS de groups para requerir cuenta aprobada
drop policy if exists "groups_select_policy" on public.groups;
create policy "groups_select_policy" on public.groups
for select using (
  public.is_current_user_approved() and (
    public.is_member_of_group(id) or created_by = public.current_profile_id()
  )
);

drop policy if exists "groups_insert_policy" on public.groups;
create policy "groups_insert_policy" on public.groups
for insert with check (
  public.is_current_user_approved() and created_by = public.current_profile_id()
);

-- 8. Actualizar add_member_by_email para no permitir añadir usuarios no aprobados
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
  if not public.is_current_user_approved() then
    raise exception 'Tu cuenta aún no ha sido aprobada por el administrador';
  end if;
  if not public.is_member_of_group(p_group_id) then
    raise exception 'No perteneces a este grupo';
  end if;

  select p.id into v_profile
  from public.profiles p
  join auth.users u on u.id = p.auth_user_id
  where lower(u.email) = lower(trim(p_email))
    and u.email_confirmed_at is not null
    and p.is_approved = true
  limit 1;

  if v_profile is null then
    raise exception 'No existe ningún usuario aprobado y verificado con ese correo';
  end if;

  if exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = v_profile
  ) then
    raise exception 'Ese usuario ya es miembro del grupo';
  end if;

  insert into public.group_members (group_id, user_id, role, percentage)
  values (p_group_id, v_profile, 'MEMBER', 0);

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

-- 9. RPC: Obtener usuarios pendientes de aprobación (solo admin)
create or replace function public.get_pending_approval_profiles()
returns table (
  id uuid,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Acceso denegado: solo los administradores pueden consultar solicitudes pendientes.';
  end if;

  return query
  select p.id, p.name, p.email, p.avatar_url, p.created_at
  from public.profiles p
  where p.is_approved = false
  order by p.created_at desc;
end;
$$;

-- 10. RPC: Aprobar usuario (solo admin)
create or replace function public.approve_user_profile(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Acceso denegado: solo los administradores pueden aprobar cuentas.';
  end if;

  update public.profiles
  set is_approved = true
  where id = p_profile_id;

  return true;
end;
$$;

-- 11. RPC: Rechazar usuario (elimina perfil y cuenta auth asociada, solo admin)
create or replace function public.reject_user_profile(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
begin
  if not public.is_current_user_admin() then
    raise exception 'Acceso denegado: solo los administradores pueden rechazar cuentas.';
  end if;

  select auth_user_id into v_auth_user_id
  from public.profiles
  where id = p_profile_id and is_approved = false;

  if v_auth_user_id is not null then
    delete from public.profiles where id = p_profile_id;
    delete from auth.users where id = v_auth_user_id;
    return true;
  end if;

  return false;
end;
$$;

-- 12. Permisos
grant execute on function public.is_current_user_admin() to authenticated;
grant execute on function public.is_current_user_approved() to authenticated;
grant execute on function public.get_pending_approval_profiles() to authenticated;
grant execute on function public.approve_user_profile(uuid) to authenticated;
grant execute on function public.reject_user_profile(uuid) to authenticated;
