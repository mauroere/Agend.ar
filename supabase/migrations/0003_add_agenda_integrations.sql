create table if not exists public.agenda_integrations (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.agenda_tenants (id) on delete cascade,
    provider text not null,
    credentials jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (tenant_id, provider)
);

create trigger agenda_trg_integrations_updated_at
before update on public.agenda_integrations
for each row execute function public.agenda_set_updated_at();

alter table public.agenda_integrations enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'agenda_integrations'
          and policyname = 'agenda_tenant_access_integrations_select'
    ) then
        create policy agenda_tenant_access_integrations_select
            on public.agenda_integrations
            for select
            using (tenant_id = public.agenda_current_tenant_id());
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'agenda_integrations'
          and policyname = 'agenda_tenant_access_integrations_write'
    ) then
        create policy agenda_tenant_access_integrations_write
            on public.agenda_integrations
            for all
            using (tenant_id = public.agenda_current_tenant_id())
            with check (tenant_id = public.agenda_current_tenant_id());
    end if;
end $$;