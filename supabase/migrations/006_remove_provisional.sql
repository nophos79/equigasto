-- =====================================================================
-- EquiGasto · 006 · Eliminar el concepto de "perfil provisional"
-- Quita la columna profiles.is_provisional y todo lo que dependía de ella.
-- ORDEN IMPORTANTE: primero se reescriben las funciones y la política que
-- usan la columna; solo al final se borra. Si se borrara antes, el trigger
-- de registro (handle_new_user) y add_member_by_email dejarían de funcionar.
-- Ejecutar completo en Supabase -> SQL Editor.
-- =====================================================================

-- 1. Trigger de registro sin la columna
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- 2. add_member_by_email sin la condición de provisional
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

-- 3. Política de inserción en profiles: solo el propio usuario
drop policy if exists "profiles_insert_policy" on public.profiles;
create policy "profiles_insert_policy" on public.profiles
for insert with check (auth_user_id = auth.uid());

-- 4. Funciones del flujo de provisionales/invitaciones, ya sin uso
drop function if exists public.add_provisional_member(uuid, text, numeric, text);
drop function if exists public.claim_provisional_profile(uuid);
drop function if exists public.accept_invitation(text);
drop function if exists public.claim_pending_invitations();
drop function if exists public.get_invitation(text);

-- 5. Perfiles provisionales antiguos (si quedara alguno) y la columna
delete from public.profiles where auth_user_id is null;
alter table public.invitations drop column if exists target_provisional_id;
alter table public.profiles drop column if exists is_provisional;

-- Comprobación: debe devolver 0 filas (la columna ya no existe)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_provisional';
