DO $$
DECLARE
    target_email TEXT := 'hola@citrix.ar';
    target_user_id UUID;
BEGIN
    -- 1. Obtener ID del usuario
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        -- 2. Eliminar dependencias en tablas públicas
        
        -- Eliminar vinculación de provider si existe
        DELETE FROM public.agenda_providers WHERE user_id = target_user_id;
        
        -- Eliminar perfil de usuario en agenda
        DELETE FROM public.agenda_users WHERE id = target_user_id;

        -- 3. Eliminar usuario de autenticación
        DELETE FROM auth.users WHERE id = target_user_id;
        
        RAISE NOTICE 'Usuario % (ID: %) eliminado correctamente.', target_email, target_user_id;
    ELSE
        RAISE NOTICE 'El usuario % no existe.', target_email;
    END IF;
END $$;
