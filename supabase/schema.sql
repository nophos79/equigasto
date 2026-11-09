-- ====================================================================
-- ESQUEMA COMPLETO Y DEFINITIVO DE BASE DE DATOS: EQUIGASTO (PostgreSQL / Supabase)
-- ====================================================================

-- 1. EXTENSIONES
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 2. TABLA: PROFILES (Solo usuarios reales registrados y verificados)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 3. TABLA: GROUPS
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text not null default '🏖️',
  category text not null default 'friends',
  created_by uuid references public.profiles(id) on delete set null,
  default_split_mode text not null default 'EQUAL' check (default_split_mode in ('EQUAL', 'PERCENTAGE')),
  created_at timestamptz not null default now()
);

-- 4. TABLA: GROUP_MEMBERS
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('ADMIN', 'MEMBER')),
  percentage numeric(5, 2) not null default 0.00,
  created_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- 5. TABLA: MOVEMENTS (Gastos compartidos, individuales, préstamos y liquidaciones)
create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  type text not null check (type in ('SHARED_EXPENSE', 'INDIVIDUAL_EXPENSE', 'LOAN', 'SETTLEMENT', 'INCOME')),
  concept text not null,
  amount_cents integer not null check (amount_cents > 0),
  paid_by_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete set null,
  split_mode text check (split_mode in ('EQUAL', 'PERCENTAGE')),
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 6. TABLA: MOVEMENT_SHARES
create table if not exists public.movement_shares (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.movements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  percentage numeric(5, 2),
  unique(movement_id, user_id)
);

-- 7. TABLA: INVITATIONS
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  email text,
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'EXPIRED')),
  created_at timestamptz not null default now()
);

-- 8. ÍNDICES DE RENDIMIENTO
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_movements_group_date on public.movements(group_id, date desc);
create index if not exists idx_movement_shares_mov on public.movement_shares(movement_id);
create index if not exists idx_profiles_auth_user on public.profiles(auth_user_id);

-- 9. FUNCIONES AUXILIARES DE SEGURIDAD (SECURITY DEFINER para romper recursión)
create or replace function public.current_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_member_of_group(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = public.current_profile_id()
  );
$$;

create or replace function public.shares_group_with(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = public.current_profile_id()
      and gm2.user_id = p_profile_id
  );
$$;

-- 10. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.movements enable row level security;
alter table public.movement_shares enable row level security;
alter table public.invitations enable row level security;

-- RLS: Profiles
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy" on public.profiles
for select using (
  auth_user_id = auth.uid()
  or public.shares_group_with(id)
);

drop policy if exists "profiles_insert_policy" on public.profiles;
create policy "profiles_insert_policy" on public.profiles
for insert with check (auth_user_id = auth.uid());

drop policy if exists "profiles_update_policy" on public.profiles;
create policy "profiles_update_policy" on public.profiles
for update using (auth_user_id = auth.uid());

-- RLS: Groups
drop policy if exists "groups_select_policy" on public.groups;
create policy "groups_select_policy" on public.groups
for select using (
  public.is_member_of_group(id) or created_by = public.current_profile_id()
);

drop policy if exists "groups_insert_policy" on public.groups;
create policy "groups_insert_policy" on public.groups
for insert with check (
  created_by = public.current_profile_id()
);

drop policy if exists "groups_update_policy" on public.groups;
create policy "groups_update_policy" on public.groups
for update using (
  public.is_member_of_group(id)
);

drop policy if exists "groups_delete_policy" on public.groups;
create policy "groups_delete_policy" on public.groups
for delete using (
  created_by = public.current_profile_id()
);

-- RLS: Group Members
drop policy if exists "members_select_policy" on public.group_members;
create policy "members_select_policy" on public.group_members
for select using (
  public.is_member_of_group(group_id)
);

drop policy if exists "members_insert_policy" on public.group_members;
create policy "members_insert_policy" on public.group_members
for insert with check (
  public.is_member_of_group(group_id)
  or exists (
    select 1 from public.groups g
    where g.id = group_id and g.created_by = public.current_profile_id()
  )
);

drop policy if exists "members_update_policy" on public.group_members;
create policy "members_update_policy" on public.group_members
for update using (
  public.is_member_of_group(group_id)
);

drop policy if exists "members_delete_policy" on public.group_members;
create policy "members_delete_policy" on public.group_members
for delete using (
  public.is_member_of_group(group_id)
);

-- RLS: Movements
drop policy if exists "movements_select_policy" on public.movements;
create policy "movements_select_policy" on public.movements
for select using (
  public.is_member_of_group(group_id)
);

drop policy if exists "movements_insert_policy" on public.movements;
create policy "movements_insert_policy" on public.movements
for insert with check (
  public.is_member_of_group(group_id)
);

drop policy if exists "movements_update_policy" on public.movements;
create policy "movements_update_policy" on public.movements
for update using (
  public.is_member_of_group(group_id)
);

drop policy if exists "movements_delete_policy" on public.movements;
create policy "movements_delete_policy" on public.movements
for delete using (
  public.is_member_of_group(group_id)
);

-- RLS: Movement Shares
drop policy if exists "shares_select_policy" on public.movement_shares;
create policy "shares_select_policy" on public.movement_shares
for select using (
  exists (
    select 1 from public.movements m
    where m.id = movement_shares.movement_id
      and public.is_member_of_group(m.group_id)
  )
);

drop policy if exists "shares_insert_policy" on public.movement_shares;
create policy "shares_insert_policy" on public.movement_shares
for insert with check (
  exists (
    select 1 from public.movements m
    where m.id = movement_shares.movement_id
      and public.is_member_of_group(m.group_id)
  )
);

drop policy if exists "shares_update_policy" on public.movement_shares;
create policy "shares_update_policy" on public.movement_shares
for update using (
  exists (
    select 1 from public.movements m
    where m.id = movement_shares.movement_id
      and public.is_member_of_group(m.group_id)
  )
);

drop policy if exists "shares_delete_policy" on public.movement_shares;
create policy "shares_delete_policy" on public.movement_shares
for delete using (
  exists (
    select 1 from public.movements m
    where m.id = movement_shares.movement_id
      and public.is_member_of_group(m.group_id)
  )
);

-- 11. TRIGGER: Crear perfil automáticamente al registrar usuario en Supabase Auth
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 12. FUNCIÓN: Añadir miembro por correo verificado
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

-- 13. PERMISOS
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.movements to authenticated;
grant select, insert, update, delete on public.movement_shares to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_member_of_group(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;
grant execute on function public.add_member_by_email(uuid, text) to authenticated;

-- 14. PUBLICACIÓN REALTIME
do $$
begin
  begin
    alter publication supabase_realtime add table public.movements;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.movement_shares;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.group_members;
  exception when duplicate_object then null;
  end;
end $$;
