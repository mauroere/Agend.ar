alter table public.agenda_tenants
  add column if not exists public_slug text unique,
  add column if not exists custom_domain text unique,
  add column if not exists public_metadata jsonb not null default '{}'::jsonb;

update public.agenda_tenants
set public_slug = coalesce(
  public_slug,
  concat('tenant-', substring(id::text for 8))
)
where public_slug is null;

create unique index if not exists agenda_tenants_public_slug_idx on public.agenda_tenants (public_slug)
where
    public_slug is not null;

create unique index if not exists agenda_tenants_custom_domain_idx on public.agenda_tenants (custom_domain)
where
    custom_domain is not null;