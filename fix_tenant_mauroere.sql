DO $$
DECLARE
    -- El ID del tenant "Admin" que usa tu usuario principal
    target_tenant UUID := '6e41ed1d-7c3c-4e12-863b-62bc5de3c132'; 
    target_email TEXT := 'mauroere@gmail.com';
    target_user_id UUID;
BEGIN
    -- Obtenemos el ID del usuario mauroere@gmail.com
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        -- 1. Actualizar la tabla de usuarios (agenda_users)
        UPDATE public.agenda_users
        SET tenant_id = target_tenant
        WHERE id = target_user_id;

        -- 2. Actualizar si existe un perfil de profesional (agenda_providers) vinculado
        -- Esto asegura que si ya creaste un 'Provider' para él, también se mueva de empresa
        UPDATE public.agenda_providers
        SET tenant_id = target_tenant
        WHERE user_id = target_user_id;
        
        RAISE NOTICE 'CORREGIDO: Usuario % movido al tenant %', target_email, target_tenant;
    ELSE
        RAISE NOTICE 'ERROR: Usuario % no encontrado en auth.users', target_email;
    END IF;
END $$;
