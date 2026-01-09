
-- 0007_add_provider_metadata.sql

alter table public.agenda_providers 
add column if not exists metadata jsonb default '{}'::jsonb;
