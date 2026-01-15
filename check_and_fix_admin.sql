-- 1. VERIFICACIÓN (Selecciona esto y ejecútalo para ver el estado actual)
SELECT 
    au.email, 
    CASE WHEN pu.id IS NOT NULL THEN 'SI' ELSE 'NO' END as "existe_en_public",
    pu.is_platform_admin as "es_admin_actualmente"
FROM auth.users au
LEFT JOIN public.agenda_users pu ON pu.id = au.id
WHERE au.email = 'mauro.rementeria@tmoviles.com.ar';

-- 2. CORRECCIÓN (Selecciona esto y ejecútalo para forzar el admin)
UPDATE public.agenda_users
SET is_platform_admin = true
WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'mauro.rementeria@tmoviles.com.ar'
);