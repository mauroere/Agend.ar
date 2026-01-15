SELECT
    t.name as tenant_name,
    l.id as location_id,
    l.name as location_name
FROM public.agenda_locations l
    JOIN public.agenda_tenants t ON t.id = l.tenant_id
WHERE
    t.name = 'Clínica Reparada';