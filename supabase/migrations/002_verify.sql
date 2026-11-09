-- Comprobación tras ejecutar 002_fase5_auth_invitations.sql
-- Debe devolver: 6 funciones, políticas en invitations (3), shares_delete y members_delete,
-- y 3 tablas en la publicación realtime.

select 'funciones' as tipo, routine_name as nombre
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('current_profile_id','shares_group_with','add_provisional_member',
                       'get_invitation','accept_invitation','claim_pending_invitations')
union all
select 'politica', tablename || '.' || policyname
from pg_policies
where schemaname = 'public'
  and (tablename = 'invitations' or policyname in ('shares_delete_policy','members_delete_policy'))
union all
select 'realtime', tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by 1, 2;
