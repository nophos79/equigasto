-- =====================================================================
-- EquiGasto · 003 · Permisos base (GRANT) para usuarios autenticados
-- Error que corrige: "permission denied for table profiles"
-- Los proyectos nuevos de Supabase no conceden privilegios por defecto
-- a las tablas creadas por SQL. RLS sigue filtrando las filas.
-- Idempotente. Ejecutar en Supabase -> SQL Editor.
-- =====================================================================

grant usage on schema public to authenticated, anon;

-- Solo usuarios con sesión acceden a las tablas; RLS decide qué filas.
grant select, insert, update, delete on public.profiles         to authenticated;
grant select, insert, update, delete on public.groups           to authenticated;
grant select, insert, update, delete on public.group_members    to authenticated;
grant select, insert, update, delete on public.movements        to authenticated;
grant select, insert, update, delete on public.movement_shares  to authenticated;
grant select, insert, update, delete on public.invitations      to authenticated;

-- Tablas futuras creadas desde el SQL Editor
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- Comprobación: debe listar 6 tablas con los 4 privilegios
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'authenticated'
group by table_name
order by table_name;
