DO $$
DECLARE
    -- Nombre exacto del tenant destino
    target_tenant_name TEXT := 'Clínica Reparada';
    target_tenant_id UUID;
    target_email TEXT := 'mauroere@gmail.com';
    target_user_id UUID;
BEGIN
    -- 1. Buscar el ID del tenant por nombre
    SELECT id INTO target_tenant_id 
    FROM public.agenda_tenants 
    WHERE name = target_tenant_name;

    -- 2. Buscar el usuario
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;

    -- Validaciones
    IF target_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró el tenant con nombre "%"', target_tenant_name;
    END IF;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró el usuario "%"', target_email;
    END IF;

    -- 3. Actualizar al usuario para que pertenezca a este tenant
    UPDATE public.agenda_users
    SET tenant_id = target_tenant_id
    WHERE id = target_user_id;

    -- 4. Actualizar también si es Provider (para que vea sus turnos)
    UPDATE public.agenda_providers
    SET tenant_id = target_tenant_id
    WHERE user_id = target_user_id;
    
    RAISE NOTICE 'ÉXITO: Usuario % movido al tenant "%" (ID: %)', target_email, target_tenant_name, target_tenant_id;

END $$;