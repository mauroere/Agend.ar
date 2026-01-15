-- Migration to add OAuth tokens storage for calendar integrations
-- We store tokens per user (provider), NOT per tenant, because a doctor's calendar is personal.
create table if not exists public.agenda_provider_integrations (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.agenda_users(id) on delete cascade,
  provider text not null check (provider in ('google_calendar', 'outlook_calendar', 'calendly')),
  
  -- OAuth Data
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  img_url text,           -- To show user avatar from the external provider
  email text,             -- To show which account is connected
  
  -- Meta
  settings jsonb default '{}'::jsonb, -- Store specific settings like "sync_strategy": "two_way"
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraint: One active integration per provider per type (usually)
  unique(user_id, provider)
);

-- Index for fast lookup when syncing
create index if not exists agenda_provider_integrations_user_idx on public.agenda_provider_integrations(user_id);

-- Add 'calendar_event_id' to appointments to link them to external systems
alter table public.agenda_appointments 
add column if not exists external_calendar_id text,
add column if not exists external_calendar_provider text;

-- Create index for checking existing external events
create index if not exists agenda_appointments_external_id_idx on public.agenda_appointments(external_calendar_id);
