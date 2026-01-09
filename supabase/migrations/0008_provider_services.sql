create table if not exists public.agenda_provider_services (
    provider_id uuid not null references public.agenda_providers (id) on delete cascade,
    service_id uuid not null references public.agenda_services (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (provider_id, service_id)
);

alter table public.agenda_provider_services enable row level security;

create policy agenda_tenant_access_provider_services on public.agenda_provider_services for all using (
    exists (
        select 1
        from public.agenda_providers p
        where
            p.id = agenda_provider_services.provider_id
            and p.tenant_id = public.agenda_current_tenant_id ()
    )
)
with
    check (
        exists (
            select 1
            from public.agenda_providers p
            where
                p.id = agenda_provider_services.provider_id
                and p.tenant_id = public.agenda_current_tenant_id ()
        )
    );

-- Index for faster lookups
create index if not exists agenda_idx_provider_services_service on public.agenda_provider_services (service_id);