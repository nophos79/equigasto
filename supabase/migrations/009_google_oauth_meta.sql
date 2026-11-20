-- =====================================================================
-- EquiGasto · Migración 009: Soporte metadatos Google OAuth (Avatar y Nombre)
-- Permite que al entrar con Google se extraigan correctamente 'full_name' y 'picture'
-- =====================================================================

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
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    v_is_admin,
    v_is_admin
  );
  return new;
end;
$$;
