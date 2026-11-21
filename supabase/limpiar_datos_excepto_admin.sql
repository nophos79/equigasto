-- =====================================================================
-- SCRIPT DE LIMPIEZA PARA PUESTA EN PRODUCCIÓN (RESET DE DATOS)
-- =====================================================================
-- Este script:
-- 1. Borra todos los gastos, préstamos, liquidaciones e ingresos (movements, movement_shares).
-- 2. Borra todas las invitaciones (invitations).
-- 3. Borra todos los miembros de grupos (group_members).
-- 4. Borra todos los grupos creados (groups).
-- 5. Borra todos los usuarios de prueba en auth.users y public.profiles EXCEPTO tu usuario.
-- 6. Garantiza que tu cuenta quede activa, aprobada y con rol de Administrador.
-- =====================================================================

DO $$
DECLARE
  -- Cambia este correo si tu cuenta de acceso es diferente:
  v_admin_email text := 'barrosod@gmail.com';
  v_admin_auth_id uuid;
  v_admin_profile_id uuid;
BEGIN
  -- 1. Obtener los identificadores de tu usuario
  SELECT id INTO v_admin_auth_id 
  FROM auth.users 
  WHERE lower(email) = lower(trim(v_admin_email));

  IF v_admin_auth_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún usuario con el correo % en auth.users. Verifica la dirección antes de continuar.', v_admin_email;
  END IF;

  SELECT id INTO v_admin_profile_id 
  FROM public.profiles 
  WHERE auth_user_id = v_admin_auth_id;

  RAISE NOTICE 'Preservando usuario Administrador: % (Auth ID: %, Profile ID: %)', v_admin_email, v_admin_auth_id, v_admin_profile_id;

  -- 2. Borrar todos los movimientos y repartos
  DELETE FROM public.movement_shares;
  DELETE FROM public.movements;

  -- 3. Borrar invitaciones y membresías
  DELETE FROM public.invitations;
  DELETE FROM public.group_members;

  -- 4. Borrar todos los grupos
  DELETE FROM public.groups;

  -- 5. Borrar los demás perfiles y usuarios de autenticación
  -- (Al borrar de auth.users, el borrado en cascada elimina también sus filas en public.profiles)
  DELETE FROM auth.users 
  WHERE id != v_admin_auth_id;

  DELETE FROM public.profiles 
  WHERE auth_user_id != v_admin_auth_id OR auth_user_id IS NULL;

  -- 6. Asegurar que tu cuenta quede 100% activa, verificada y como Administrador
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE id = v_admin_auth_id;

  UPDATE public.profiles
  SET 
    is_admin = true,
    is_approved = true,
    name = COALESCE(NULLIF(trim(name), ''), split_part(v_admin_email, '@', 1))
  WHERE auth_user_id = v_admin_auth_id;

  RAISE NOTICE '¡Limpieza completada con éxito! La app ha quedado limpia y lista para producción.';
END $$;
