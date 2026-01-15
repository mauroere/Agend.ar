-- Agregar columna temp_password_hint a agenda_providers para recordar la contraseña creada
ALTER TABLE public.agenda_providers ADD COLUMN temp_password_hint TEXT;
