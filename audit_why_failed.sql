-- 1. Ver estado completo del usuario
SELECT
    au.email,
    au.id as auth_id,
    -- Si existe en agenda_users
    CASE
        WHEN pu.id IS NOT NULL THEN 'SI'
        ELSE 'NO'
    END as en_agenda_users,
    pu.tenant_id as tenant_actual_user,
    t1.name as nombre_tenant_user,
    -- Si existe como provider vinculado
    CASE
        WHEN pp.id IS NOT NULL THEN 'SI'
        ELSE 'NO'
    END as es_provider_vinculado,
    pp.tenant_id as tenant_actual_provider,
    t2.name as nombre_tenant_provider
FROM
    auth.users au
    LEFT JOIN public.agenda_users pu ON pu.id = au.id
    LEFT JOIN public.agenda_tenants t1 ON t1.id = pu.tenant_id
    LEFT JOIN public.agenda_providers pp ON pp.user_id = au.id
    LEFT JOIN public.agenda_tenants t2 ON t2.id = pp.tenant_id
WHERE
    au.email = 'mauroere@gmail.com';

-- 2. Ver si existe un provider "huérfano" que deberíamos vincular (por nombre)
SELECT *
FROM public.agenda_providers
WHERE
    full_name ILIKE '%Mauro%'
    OR full_name ILIKE '%Rementeria%';