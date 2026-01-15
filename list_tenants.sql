-- Buscar tenants que se llamen parecido a 'prueba'
SELECT id, name, created_at 
FROM public.agenda_tenants 
WHERE name ILIKE '%prueba%';

-- O listar los últimos 10 creados si el nombre es diferente
SELECT id, name, created_at 
FROM public.agenda_tenants 
ORDER BY created_at DESC 
LIMIT 10;
