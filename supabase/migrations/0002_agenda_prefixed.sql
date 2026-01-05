-- Full schema with agenda_ prefix to avoid collisions
-- Requires Postgres extensions used by exclusion constraint
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- Helper to read tenant_id from JWT claims
create or replace function public.agenda_current_tenant_id()
returns uuid as $$
  select nullif(current_setting('request.jwt.claim.tenant_id', true), '')::uuid;
$$ language sql stable;

grant usage on schema public to authenticated;

-- Tenants
create table if not exists public.agenda_tenants (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default now()
);

-- Locations
create table if not exists public.agenda_locations (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.agenda_tenants(id) on delete cascade,
    name text not null,
    address text,
    timezone text not null default 'America/Argentina/Buenos_Aires',
    business_hours jsonb not null,
    default_duration integer not null default 30,
    buffer_minutes integer not null default 0,
    created_at timestamptz not null default now()
);

-- Users (links to auth.users)
create table if not exists public.agenda_users (
    id uuid primary key references auth.users(id) on delete cascade,
    tenant_id uuid not null references public.agenda_tenants(id) on delete cascade,
    role text not null check (role in ('owner','staff')),
    created_at timestamptz not null default now()
);

-- Patients
create table if not exists public.agenda_patients (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.agenda_tenants(id) on delete cascade,
    full_name text not null,
    phone_e164 text not null,
    opt_out boolean not null default false,
    opt_out_at timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    unique (tenant_id, phone_e164)
);

-- Appointments
create table if not exists public.agenda_appointments (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.agenda_tenants(id) on delete cascade,
    location_id uuid not null references public.agenda_locations(id) on delete cascade,
    patient_id uuid not null references public.agenda_patients(id) on delete cascade,
    start_at timestamptz not null,
    end_at timestamptz not null,
    status text not null check (status in ('pending','confirmed','reschedule_requested','canceled','completed','no_show')),
    service_name text,
    internal_notes text,
    created_by uuid references public.agenda_users(id),
    updated_at timestamptz not null default now(),
    constraint agenda_chk_no_overlap exclude using gist (
      tenant_id with =,
      location_id with =,
      tstzrange(start_at, end_at, '[)') with &&
    )
);

create or replace function public.agenda_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger agenda_trg_appointments_updated_at
before update on public.agenda_appointments
for each row execute function public.agenda_set_updated_at();

-- Waitlist
create table if not exists public.agenda_waitlist (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.agenda_tenants(id) on delete cascade,
    location_id uuid not null references public.agenda_locations(id) on delete cascade,
    patient_id uuid not null references public.agenda_patients(id) on delete cascade,
    active boolean not null default true,
    preferred_windows jsonb,
    priority integer not null default 100,
    created_at timestamptz not null default now()
);

-- Message templates
create table if not exists public.agenda_message_templates (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.agenda_tenants(id) on delete cascade,
    name text not null,
    language text not null default 'es',
    content text not null,
    meta_template_name text,
    status text not null default 'pending'
);

-- Message log
create table if not exists public.agenda_message_log (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.agenda_tenants(id) on delete cascade,
    appointment_id uuid references public.agenda_appointments(id) on delete set null,
    patient_id uuid not null references public.agenda_patients(id) on delete cascade,
    direction text not null check (direction in ('in','out')),
    type text,
    status text not null,
    wa_message_id text,
    payload_json jsonb,
    created_at timestamptz not null default now()
);

-- Webhook events
create table if not exists public.agenda_webhook_events (
    id uuid primary key default gen_random_uuid(),
    provider text not null,
    event_id text not null,
    payload_json jsonb not null,
    created_at timestamptz not null default now(),
    unique (provider, event_id)
);

-- Indexes
create index if not exists agenda_idx_appointments_tenant_location_start on public.agenda_appointments (tenant_id, location_id, start_at);
create index if not exists agenda_idx_message_log_appointment_type on public.agenda_message_log (appointment_id, type);
create index if not exists agenda_idx_patients_phone on public.agenda_patients (tenant_id, phone_e164);

-- RLS enablement
alter table public.agenda_tenants enable row level security;
alter table public.agenda_locations enable row level security;
alter table public.agenda_users enable row level security;
alter table public.agenda_patients enable row level security;
alter table public.agenda_appointments enable row level security;
alter table public.agenda_waitlist enable row level security;
alter table public.agenda_message_templates enable row level security;
alter table public.agenda_message_log enable row level security;

-- Policies
create policy agenda_tenant_select_tenants on public.agenda_tenants for select using (
  id = public.agenda_current_tenant_id()
);

create policy agenda_tenant_select_locations on public.agenda_locations for select using (
  tenant_id = public.agenda_current_tenant_id()
);
create policy agenda_tenant_insert_locations on public.agenda_locations for insert with check (
  tenant_id = public.agenda_current_tenant_id()
);

create policy agenda_tenant_access_users on public.agenda_users for select using (
  tenant_id = public.agenda_current_tenant_id()
);

create policy agenda_tenant_access_patients on public.agenda_patients for all using (
  tenant_id = public.agenda_current_tenant_id()
) with check (
  tenant_id = public.agenda_current_tenant_id()
);

create policy agenda_tenant_access_appointments on public.agenda_appointments for all using (
  tenant_id = public.agenda_current_tenant_id()
) with check (
  tenant_id = public.agenda_current_tenant_id()
);

create policy agenda_tenant_access_waitlist on public.agenda_waitlist for all using (
  tenant_id = public.agenda_current_tenant_id()
) with check (
  tenant_id = public.agenda_current_tenant_id()
);

create policy agenda_tenant_access_message_templates on public.agenda_message_templates for all using (
  tenant_id = public.agenda_current_tenant_id()
) with check (
  tenant_id = public.agenda_current_tenant_id()
);

create policy agenda_tenant_access_message_log_select on public.agenda_message_log for select using (
  tenant_id = public.agenda_current_tenant_id()
);
create policy agenda_tenant_access_message_log_insert on public.agenda_message_log for insert with check (
  tenant_id = public.agenda_current_tenant_id()
);

-- Safety check to ensure JWT contains tenant_id
DO $$
begin
  perform public.agenda_current_tenant_id();
exception when others then
  raise exception 'JWT must include tenant_id claim';
end$$;
