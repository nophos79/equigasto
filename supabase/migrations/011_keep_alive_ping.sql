-- =====================================================================
-- EquiGasto · Migración 011: Función keep-alive public.ping()
-- RPC ligero sin exposición de datos para el plan gratuito de Supabase.
-- Evita la pausa automática tras 7 días de inactividad sin conceder
-- acceso anon a ninguna tabla de la aplicación.
-- Idempotente. Ejecutar en Supabase -> SQL Editor.
-- =====================================================================

create or replace function public.ping()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select 'ok'::text;
$$;

grant usage on schema public to anon;
grant execute on function public.ping() to anon, authenticated;
