DO $$
DECLARE
    target_email TEXT := 'mauroere@gmail.com';
    target_user_id UUID;
    target_tenant_id UUID;
    new_provider_id UUID;
BEGIN
    -- 1. Obtener ID y Tenant del usuario
    SELECT id, tenant_id INTO target_user_id, target_tenant_id
    FROM public.agenda_users
    WHERE id = (SELECT id FROM auth.users WHERE email = target_email);

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario NO encontrado en agenda_users. Algo está mal.';
    END IF;

    -- 2. Crear el perfil de Profesional (Provider)
    INSERT INTO public.agenda_providers (
        tenant_id,
        full_name,
        user_id,   -- Aquí vinculamos con el login
        active,
        specialties,
        bio
    ) VALUES (
        target_tenant_id,
        'Mauro ERE (Profesional)', -- Nombre visible en el calendario
        target_user_id,
        true,
        ARRAY['General'],
        'Perfil generado automáticamente para pruebas.'
    )
    RETURNING id INTO new_provider_id;

    RAISE NOTICE 'ÉXITO: Se creó el profesional para % con ID % en el tenant %', target_email, new_provider_id, target_tenant_id;
END $$;