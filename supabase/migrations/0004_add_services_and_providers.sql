-- Services catalog stores treatments with pricing metadata
create table if not exists public.agenda_services (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.agenda_tenants (id) on delete cascade,
    name text not null,
    description text,
    duration_minutes integer not null default 30,
    price_minor_units integer,
    currency text not null default 'ARS',
    color text,
    image_url text,
    active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (tenant_id, name)
);

create trigger agenda_trg_services_updated_at
before update on public.agenda_services
for each row execute function public.agenda_set_updated_at();

alter table public.agenda_services enable row level security;

create policy agenda_tenant_access_services on public.agenda_services for all
using (tenant_id = public.agenda_current_tenant_id())
with check (tenant_id = public.agenda_current_tenant_id());

-- Providers register professionals who own their calendars
create table if not exists public.agenda_providers (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.agenda_tenants (id) on delete cascade,
    full_name text not null,
    bio text,
    avatar_url text,
    color text,
    default_location_id uuid references public.agenda_locations (id) on delete set null,
    active boolean not null default true,
    specialties text[] not null default '{}',
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (tenant_id, full_name)
);

create trigger agenda_trg_providers_updated_at
before update on public.agenda_providers
for each row execute function public.agenda_set_updated_at();

alter table public.agenda_providers enable row level security;

create policy agenda_tenant_access_providers on public.agenda_providers for all
using (tenant_id = public.agenda_current_tenant_id())
with check (tenant_id = public.agenda_current_tenant_id());

-- Optional helper index for quick filtering
create index if not exists agenda_idx_services_tenant_active
    on public.agenda_services (tenant_id, active, sort_order);

create index if not exists agenda_idx_providers_tenant_active
    on public.agenda_providers (tenant_id, active, default_location_id);

-- Extend appointments with service/provider linkage and pricing snapshot
alter table public.agenda_appointments
    add column if not exists service_id uuid references public.agenda_services (id) on delete set null,
    add column if not exists provider_id uuid references public.agenda_providers (id) on delete set null,
    add column if not exists service_snapshot jsonb;

-- Rebuild exclusion constraint to include provider dimension
alter table public.agenda_appointments
    drop constraint if exists agenda_chk_no_overlap;

alter table public.agenda_appointments
    add constraint agenda_chk_no_overlap exclude using gist (
        tenant_id with =,
        location_id with =,
        provider_id with =,
        tstzrange(start_at, end_at, '[)') with &&
    );

create index if not exists agenda_idx_appointments_service on public.agenda_appointments (service_id);
create index if not exists agenda_idx_appointments_provider on public.agenda_appointments (provider_id);
