-- 1. Ver qué usuario es mauroere@gmail.com y qué tenant tiene
SELECT au.id, au.email, pu.tenant_id, t.name as tenant_name, pu.is_platform_admin
FROM auth.users au
LEFT JOIN public.agenda_users pu ON pu.id = au.id
LEFT JOIN public.agenda_tenants t ON t.id = pu.tenant_id
WHERE au.email = 'mauroere@gmail.com';

-- 2. Ver todos los tenants disponibles para saber cuál es el correcto
SELECT * FROM public.agenda_tenants;

-- 3. Ver qué tenant tiene el otro usuario (mauro.rementeria...) para comparar
SELECT au.email, pu.tenant_id, t.name
FROM auth.users au
JOIN public.agenda_users pu ON pu.id = au.id
JOIN public.agenda_tenants t ON t.id = pu.tenant_id
WHERE au.email = 'mauro.rementeria@tmoviles.com.ar';
