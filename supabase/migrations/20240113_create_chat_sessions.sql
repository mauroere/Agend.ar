-- Tabla para mantener el estado de la conversación (Memoria del Bot)
CREATE TABLE IF NOT EXISTS public.agenda_chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.agenda_tenants(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL, -- Formato E.164 (+549...)
    step TEXT NOT NULL DEFAULT 'START', -- Paso actual del flujo
    data JSONB DEFAULT '{}'::jsonb, -- Datos temporales (draft del turno)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, phone_number)
);

-- Indice para búsqueda rápida por usuario y tenant
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lookup ON public.agenda_chat_sessions (tenant_id, phone_number);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_session_timestamp
BEFORE UPDATE ON public.agenda_chat_sessions
FOR EACH ROW EXECUTE PROCEDURE update_chat_session_timestamp();