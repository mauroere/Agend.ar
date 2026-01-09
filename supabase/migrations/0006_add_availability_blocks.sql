
-- 0006_add_availability_blocks.sql

-- Table for time blocks (vacations, breaks, etc.)
create table if not exists public.agenda_availability_blocks (
    id uuid primary key default gen_random_uuid (),
    tenant_id uuid not null references public.agenda_tenants (id) on delete cascade,
    provider_id uuid references public.agenda_providers (id) on delete cascade,
    location_id uuid references public.agenda_locations (id) on delete cascade,
    start_at timestamptz not null,
    end_at timestamptz not null,
    reason text,
    created_at timestamptz not null default now(),
    constraint agenda_chk_block_dates check (end_at > start_at)
);

-- Index for querying
create index if not exists agenda_idx_blocks_range on public.agenda_availability_blocks (
    tenant_id,
    provider_id,
    start_at,
    end_at
);

-- RLS
alter table public.agenda_availability_blocks enable row level security;

create policy agenda_tenant_access_blocks on public.agenda_availability_blocks for all using (
    tenant_id = public.agenda_current_tenant_id ()
)
with
    check (
        tenant_id = public.agenda_current_tenant_id ()
    );
