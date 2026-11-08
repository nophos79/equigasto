-- ====================================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS: EQUIGASTO (PostgreSQL / Supabase)
-- ====================================================================

-- 1. EXTENSIONES
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 2. TABLA: PROFILES
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text,
  avatar_url text,
  is_provisional boolean not null default false,
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
  type text not null check (type in ('SHARED_EXPENSE', 'INDIVIDUAL_EXPENSE', 'LOAN', 'SETTLEMENT')),
  concept text not null,
  amount_cents bigint not null check (amount_cents > 0),
  paid_by_id uuid not null references public.profiles(id) on delete restrict,
  recipient_id uuid references public.profiles(id) on delete restrict,
  split_mode text check (split_mode in ('EQUAL', 'PERCENTAGE')),
  date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- 6. TABLA: MOVEMENT_SHARES (Distribución económica histórica exacta)
create table if not exists public.movement_shares (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.movements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents bigint not null check (amount_cents >= 0),
  percentage numeric(5, 2),
  created_at timestamptz not null default now(),
  unique(movement_id, user_id)
);

-- 7. TABLA: INVITATIONS (Invitaciones y vinculación de provisionales)
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  email text,
  target_provisional_id uuid references public.profiles(id) on delete set null,
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

-- 9. FUNCIÓN AUXILIAR DE SEGURIDAD (Comprobar si el usuario actual pertenece al grupo)
create or replace function public.is_member_of_group(p_group_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 
    from public.group_members gm
    join public.profiles p on p.id = gm.user_id
    where gm.group_id = p_group_id
      and p.auth_user_id = auth.uid()
  );
$$;

-- 10. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.movements enable row level security;
alter table public.movement_shares enable row level security;
alter table public.invitations enable row level security;

-- RLS: Profiles (Ver tu propio perfil o perfiles de miembros de tus grupos)
create policy "profiles_select_policy" on public.profiles
for select using (
  auth_user_id = auth.uid()
  or id in (
    select gm2.user_id
    from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    join public.profiles p on p.id = gm1.user_id
    where p.auth_user_id = auth.uid()
  )
);

create policy "profiles_insert_policy" on public.profiles
for insert with check (
  auth_user_id = auth.uid() or is_provisional = true
);

create policy "profiles_update_policy" on public.profiles
for update using (
  auth_user_id = auth.uid()
);

-- RLS: Groups (Solo miembros del grupo)
create policy "groups_select_policy" on public.groups
for select using (
  public.is_member_of_group(id) or created_by in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "groups_insert_policy" on public.groups
for insert with check (
  created_by in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "groups_update_policy" on public.groups
for update using (
  public.is_member_of_group(id)
);

-- RLS: Group Members
create policy "members_select_policy" on public.group_members
for select using (
  public.is_member_of_group(group_id)
);

create policy "members_insert_policy" on public.group_members
for insert with check (
  public.is_member_of_group(group_id) or group_id in (
    select id from public.groups where created_by in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
);

create policy "members_update_policy" on public.group_members
for update using (
  public.is_member_of_group(group_id)
);

-- RLS: Movements
create policy "movements_select_policy" on public.movements
for select using (
  public.is_member_of_group(group_id)
);

create policy "movements_insert_policy" on public.movements
for insert with check (
  public.is_member_of_group(group_id)
);

create policy "movements_update_policy" on public.movements
for update using (
  public.is_member_of_group(group_id)
);

create policy "movements_delete_policy" on public.movements
for delete using (
  public.is_member_of_group(group_id)
);

-- RLS: Movement Shares
create policy "shares_select_policy" on public.movement_shares
for select using (
  exists (
    select 1 from public.movements m
    where m.id = movement_shares.movement_id
      and public.is_member_of_group(m.group_id)
  )
);

create policy "shares_insert_policy" on public.movement_shares
for insert with check (
  exists (
    select 1 from public.movements m
    where m.id = movement_shares.movement_id
      and public.is_member_of_group(m.group_id)
  )
);

create policy "shares_update_policy" on public.movement_shares
for update using (
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
as $$
begin
  insert into public.profiles (auth_user_id, name, email, avatar_url, is_provisional)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    false
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 12. FUNCIÓN: Vincular participante provisional a usuario registrado
create or replace function public.claim_provisional_profile(p_provisional_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_current_profile_id uuid;
begin
  -- Obtener ID del perfil autenticado actual
  select id into v_current_profile_id
  from public.profiles
  where auth_user_id = auth.uid();

  if v_current_profile_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Reasignar membresías de grupos
  update public.group_members
  set user_id = v_current_profile_id
  where user_id = p_provisional_id
    and group_id not in (
      select group_id from public.group_members where user_id = v_current_profile_id
    );

  -- Reasignar movimientos pagados
  update public.movements
  set paid_by_id = v_current_profile_id
  where paid_by_id = p_provisional_id;

  -- Reasignar receptores de préstamos/liquidaciones
  update public.movements
  set recipient_id = v_current_profile_id
  where recipient_id = p_provisional_id;

  -- Reasignar participaciones económicas
  update public.movement_shares
  set user_id = v_current_profile_id
  where user_id = p_provisional_id;

  -- Eliminar perfil provisional ahora obsoleto
  delete from public.profiles where id = p_provisional_id and is_provisional = true;

  return true;
end;
$$;
