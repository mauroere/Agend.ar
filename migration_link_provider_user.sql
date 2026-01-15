-- Agregar columna user_id a agenda_providers para vincular usuarios login con profesionales
ALTER TABLE public.agenda_providers
ADD COLUMN user_id UUID REFERENCES auth.users (id);

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_agenda_providers_user_id ON public.agenda_providers (user_id);

-- Comentario
COMMENT ON COLUMN public.agenda_providers.user_id IS 'Link optional to auth.users if this provider can login';