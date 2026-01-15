-- 1. SOLUCIÓN AL LOOP INFINITO (RECURSIÓN)
-- Creamos una función segura que chequea permisos sin activar las políticas
CREATE OR REPLACE FUNCTION public.get_is_admin_safe()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.agenda_users WHERE id = auth.uid()),
    false
  );
$$;

-- Borramos TODAS las políticas viejas que pueden causar problemas
DROP POLICY IF EXISTS "agenda_tenant_access_users" ON public.agenda_users;

DROP POLICY IF EXISTS "agenda_tenant_access_users_fix" ON public.agenda_users;

DROP POLICY IF EXISTS "agenda_users_policy" ON public.agenda_users;

DROP POLICY IF EXISTS "platform_admins_policy" ON public.agenda_users;

DROP POLICY IF EXISTS "admin_all_access" ON public.agenda_users;

DROP POLICY IF EXISTS "admins_read_all" ON public.agenda_users;

DROP POLICY IF EXISTS "agenda_users_access_v2" ON public.agenda_users;

DROP POLICY IF EXISTS "agenda_users_access_final" ON public.agenda_users;

DROP POLICY IF EXISTS "agenda_users_update_admin" ON public.agenda_users;

-- Creamos la política definitiva (Limpia y segura)
CREATE POLICY "agenda_users_access_final" ON public.agenda_users
FOR SELECT
USING (
    tenant_id = (select nullif(current_setting('request.jwt.claim.tenant_id', true), '')::uuid)
    OR 
    get_is_admin_safe() = true
    OR
    id = auth.uid()
);

-- Permisos de escritura para el admin
CREATE POLICY "agenda_users_update_admin" ON public.agenda_users FOR
UPDATE USING (get_is_admin_safe () = true);

-- 2. ASIGNACIÓN DE PERMISOS SUPER ADMIN
-- Actualizamos tu usuario específico (EL QUE TÚ ELEGISTE)
UPDATE public.agenda_users
SET
    is_platform_admin = true
WHERE
    id IN (
        SELECT id
        FROM auth.users
        WHERE
            email = 'mauro.rementeria@tmoviles.com.ar' -- <--- Corregido al email de la empresa
    );