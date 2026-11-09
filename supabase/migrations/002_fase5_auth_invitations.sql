-- =====================================================================
-- EquiGasto · Migración Fase 5
-- Corrige RLS (recursión en profiles, políticas faltantes) y añade RPCs
-- seguras para el flujo de invitaciones y vinculación de provisionales.
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query
-- Es idempotente: se puede ejecutar varias veces sin romper nada.
-- =====================================================================

-- 1. Helper: id del perfil del usuario autenticado (evita recursión RLS)
create or replace function public.current_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

-- 2. Helper: ¿comparte grupo el perfil indicado con el usuario actual?
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

-- 3. PROFILES: reemplazar política SELECT recursiva
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy" on public.profiles
for select using (
  auth_user_id = auth.uid()
  or public.shares_group_with(id)
);

-- 4. GROUPS: usar helper en lugar de subconsulta a profiles
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

-- 5. GROUP_MEMBERS: insert por miembros o creador del grupo
drop policy if exists "members_insert_policy" on public.group_members;
create policy "members_insert_policy" on public.group_members
for insert with check (
  public.is_member_of_group(group_id)
  or exists (
    select 1 from public.groups g
    where g.id = group_id and g.created_by = public.current_profile_id()
  )
);

drop policy if exists "members_delete_policy" on public.group_members;
create policy "members_delete_policy" on public.group_members
for delete using (
  public.is_member_of_group(group_id)
);

-- 6. MOVEMENT_SHARES: faltaba DELETE (necesario al editar movimientos)
drop policy if exists "shares_delete_policy" on public.movement_shares;
create policy "shares_delete_policy" on public.movement_shares
for delete using (
  exists (
    select 1 from public.movements m
    where m.id = movement_shares.movement_id
      and public.is_member_of_group(m.group_id)
  )
);

-- 7. INVITATIONS: tenía RLS activado sin ninguna política
drop policy if exists "invitations_select_policy" on public.invitations;
create policy "invitations_select_policy" on public.invitations
for select using (
  public.is_member_of_group(group_id)
  or inviter_id = public.current_profile_id()
);

drop policy if exists "invitations_insert_policy" on public.invitations;
create policy "invitations_insert_policy" on public.invitations
for insert with check (
  public.is_member_of_group(group_id)
  and inviter_id = public.current_profile_id()
);

drop policy if exists "invitations_update_policy" on public.invitations;
create policy "invitations_update_policy" on public.invitations
for update using (
  public.is_member_of_group(group_id)
);

-- 8. RPC: crear participante provisional + invitación en una operación
create or replace function public.add_provisional_member(
  p_group_id uuid,
  p_name text,
  p_percentage numeric default 0,
  p_email text default null
)
returns table (profile_id uuid, token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter uuid := public.current_profile_id();
  v_profile uuid;
  v_token text;
begin
  if v_inviter is null then
    raise exception 'Usuario no autenticado';
  end if;
  if not public.is_member_of_group(p_group_id) then
    raise exception 'No perteneces a este grupo';
  end if;

  insert into public.profiles (name, email, is_provisional)
  values (trim(p_name), nullif(trim(coalesce(p_email, '')), ''), true)
  returning id into v_profile;

  insert into public.group_members (group_id, user_id, role, percentage)
  values (p_group_id, v_profile, 'MEMBER', coalesce(p_percentage, 0));

  insert into public.invitations (group_id, inviter_id, email, target_provisional_id)
  values (p_group_id, v_inviter, nullif(trim(coalesce(p_email, '')), ''), v_profile)
  returning invitations.token into v_token;

  return query select v_profile, v_token;
end;
$$;

-- 9. RPC: consultar una invitación por token (sin ser aún miembro)
create or replace function public.get_invitation(p_token text)
returns table (
  group_id uuid,
  group_name text,
  inviter_name text,
  provisional_name text,
  status text
)
language sql
security definer
stable
set search_path = public
as $$
  select i.group_id, g.name, p.name, tp.name, i.status
  from public.invitations i
  join public.groups g on g.id = i.group_id
  join public.profiles p on p.id = i.inviter_id
  left join public.profiles tp on tp.id = i.target_provisional_id
  where i.token = p_token;
$$;

-- 10. RPC: aceptar invitación (une al grupo y reclama el provisional)
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.current_profile_id();
  v_inv public.invitations%rowtype;
begin
  if v_me is null then
    raise exception 'Usuario no autenticado';
  end if;

  select * into v_inv from public.invitations where token = p_token for update;
  if not found then
    raise exception 'Invitación no encontrada';
  end if;
  if v_inv.status <> 'PENDING' then
    return v_inv.group_id;
  end if;

  if v_inv.target_provisional_id is not null then
    -- Reasignar todo el historial del provisional al usuario real
    update public.group_members set user_id = v_me
      where user_id = v_inv.target_provisional_id
        and group_id not in (select gm.group_id from public.group_members gm where gm.user_id = v_me);
    update public.movements set paid_by_id = v_me where paid_by_id = v_inv.target_provisional_id;
    update public.movements set recipient_id = v_me where recipient_id = v_inv.target_provisional_id;
    update public.movement_shares set user_id = v_me where user_id = v_inv.target_provisional_id;
    delete from public.group_members where user_id = v_inv.target_provisional_id;
    delete from public.profiles where id = v_inv.target_provisional_id and is_provisional = true;
  end if;

  insert into public.group_members (group_id, user_id, role, percentage)
  values (v_inv.group_id, v_me, 'MEMBER', 0)
  on conflict (group_id, user_id) do nothing;

  update public.invitations set status = 'ACCEPTED' where id = v_inv.id;
  return v_inv.group_id;
end;
$$;

-- 11. RPC: aceptar todas las invitaciones pendientes dirigidas a mi email
create or replace function public.claim_pending_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_count integer := 0;
  r record;
begin
  select email into v_email from public.profiles where id = public.current_profile_id();
  if v_email is null then
    return 0;
  end if;

  for r in
    select token from public.invitations
    where status = 'PENDING' and lower(email) = lower(v_email)
  loop
    perform public.accept_invitation(r.token);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 12. Permisos de ejecución para usuarios autenticados
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;
grant execute on function public.add_provisional_member(uuid, text, numeric, text) to authenticated;
grant execute on function public.get_invitation(text) to authenticated, anon;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.claim_pending_invitations() to authenticated;

-- 13. Realtime: publicar tablas para suscripciones en vivo
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
