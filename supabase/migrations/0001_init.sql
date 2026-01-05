create extension if not exists pgcrypto;

create table public.tenants (
    id uuid primary key default gen_random_uuid (),
    name text not null,
    created_at timestamptz not null default now()
);

create table public.locations (
    id uuid primary key default gen_random_uuid (),
    tenant_id uuid not null references public.tenants (id) on delete cascade,
    name text not null,
    address text,
    timezone text not null default 'America/Argentina/Buenos_Aires',
    business_hours jsonb not null,
    default_duration integer not null default 30,
    buffer_minutes integer not null default 0,
    created_at timestamptz not null default now()
);

create table public.users (
    id uuid primary key references auth.users (id) on delete cascade,
    tenant_id uuid not null references public.tenants (id) on delete cascade,
    role text not null check (role in ('owner', 'staff')),
    created_at timestamptz not null default now()
);

create table public.patients (
    id uuid primary key default gen_random_uuid (),
    tenant_id uuid not null references public.tenants (id) on delete cascade,
    full_name text not null,
    phone_e164 text not null,
    opt_out boolean not null default false,
    opt_out_at timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    unique (tenant_id, phone_e164)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null check (status in ('pending','confirmed','reschedule_requested','canceled','completed','no_show')),
  service_name text,
  internal_notes text,
  created_by uuid references public.users(id),
  updated_at timestamptz not null default now(),
  constraint chk_no_overlap exclude using gist (
    tenant_id with =,
    location_id with =,
    tstzrange(start_at, end_at, '[)'::text) with &&
  )
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create table public.waitlist (
    id uuid primary key default gen_random_uuid (),
    tenant_id uuid not null references public.tenants (id) on delete cascade,
    location_id uuid not null references public.locations (id) on delete cascade,
    patient_id uuid not null references public.patients (id) on delete cascade,
    active boolean not null default true,
    preferred_windows jsonb,
    priority integer not null default 100,
    created_at timestamptz not null default now()
);

create table public.message_templates (
    id uuid primary key default gen_random_uuid (),
    tenant_id uuid not null references public.tenants (id) on delete cascade,
    name text not null,
    language text not null default 'es',
    content text not null,
    meta_template_name text,
    status text not null default 'pending'
);

create table public.message_log (
    id uuid primary key default gen_random_uuid (),
    tenant_id uuid not null references public.tenants (id) on delete cascade,
    appointment_id uuid references public.appointments (id) on delete set null,
    patient_id uuid not null references public.patients (id) on delete cascade,
    direction text not null check (direction in ('in', 'out')),
    type text,
    status text not null,
    wa_message_id text,
    payload_json jsonb,
    created_at timestamptz not null default now()
);

create table public.webhook_events (
    id uuid primary key default gen_random_uuid (),
    provider text not null,
    event_id text not null,
    payload_json jsonb not null,
    created_at timestamptz not null default now(),
    unique (provider, event_id)
);

create index idx_appointments_tenant_location_start on public.appointments (
    tenant_id,
    location_id,
    start_at
);

create index idx_message_log_appointment_type on public.message_log (appointment_id, type);

create index idx_patients_phone on public.patients (tenant_id, phone_e164);

create or replace function public.current_tenant_id()
returns uuid as $$
  select nullif(current_setting('request.jwt.claim.tenant_id', true), '')::uuid;
$$ language sql stable;

grant usage on schema public to authenticated;

do $$ begin
  perform public.current_tenant_id();
exception when others then
  raise exception 'JWT must include tenant_id claim';
end $$;

alter table public.tenants enable row level security;

alter table public.locations enable row level security;

alter table public.users enable row level security;

alter table public.patients enable row level security;

alter table public.appointments enable row level security;

alter table public.waitlist enable row level security;

alter table public.message_templates enable row level security;

alter table public.message_log enable row level security;

create policy tenant_select_tenants on public.tenants for
select using (
        id = public.current_tenant_id ()
    );

create policy tenant_select_locations on public.locations for
select using (
        tenant_id = public.current_tenant_id ()
    );

do $$ begin
execute format(
    'create policy %I on public.locations for insert with check (tenant_id = public.current_tenant_id());',
    'tenant_insert_locations'
);

end $$;

create policy tenant_access_users on public.users for
select using (
        tenant_id = public.current_tenant_id ()
    );

create policy tenant_access_patients on public.patients for all using (
    tenant_id = public.current_tenant_id ()
)
with
    check (
        tenant_id = public.current_tenant_id ()
    );

create policy tenant_access_appointments on public.appointments for all using (
    tenant_id = public.current_tenant_id ()
)
with
    check (
        tenant_id = public.current_tenant_id ()
    );

create policy tenant_access_waitlist on public.waitlist for all using (
    tenant_id = public.current_tenant_id ()
)
with
    check (
        tenant_id = public.current_tenant_id ()
    );

create policy tenant_access_message_templates on public.message_templates for all using (
    tenant_id = public.current_tenant_id ()
)
with
    check (
        tenant_id = public.current_tenant_id ()
    );

create policy tenant_access_message_log on public.message_log for
select using (
        tenant_id = public.current_tenant_id ()
    );

create policy tenant_insert_message_log on public.message_log for
insert
with
    check (
        tenant_id = public.current_tenant_id ()
    );