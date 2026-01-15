-- 1. Service Categories Update
create table if not exists public.agenda_service_categories (
    id uuid not null default gen_random_uuid (),
    tenant_id uuid not null,
    name text not null,
    color text,
    sort_order integer default 0,
    active boolean default true,
    created_at timestamp
    with
        time zone default now(),
        primary key (id)
);

alter table public.agenda_services
add column if not exists category_id uuid references public.agenda_service_categories (id) on delete set null;

create index if not exists agenda_service_categories_tenant_idx on public.agenda_service_categories (tenant_id);

create index if not exists agenda_services_category_idx on public.agenda_services (category_id);

-- 2. Platform Admin Update
alter table public.agenda_users
add column if not exists is_platform_admin boolean default false;

create index if not exists agenda_users_is_platform_admin_idx on public.agenda_users (is_platform_admin);

-- 3. Calendar Integrations (NEW)
create table if not exists public.agenda_provider_integrations (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.agenda_users(id) on delete cascade,
  provider text not null check (provider in ('google_calendar', 'outlook_calendar', 'calendly')),

-- OAuth Data
access_token text,
refresh_token text,
expires_at timestamptz,
img_url text,
email text,

-- Meta
settings jsonb default '{}'::jsonb, 
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

-- Constraint: One active integration per provider per type
unique(user_id, provider) );

create index if not exists agenda_provider_integrations_user_idx on public.agenda_provider_integrations (user_id);

alter table public.agenda_appointments
add column if not exists external_calendar_id text,
add column if not exists external_calendar_provider text;

create index if not exists agenda_appointments_external_id_idx on public.agenda_appointments (external_calendar_id);