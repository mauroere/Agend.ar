-- CHECK 1: Ver si el usuario mauro tiene tenant_id
SELECT id, email, is_platform_admin, tenant_id 
FROM public.agenda_users 
WHERE email = 'mauro.rementeria@tmoviles.com.ar';

-- CHECK 2: Ver que tenants existen para asignarle uno
SELECT * FROM public.agenda_tenants;

-- (Opcional) Si no hay tenants, podríamos necesitar crear uno.
