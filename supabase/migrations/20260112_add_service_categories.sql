create table if not exists public.agenda_service_categories (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  color text,
  sort_order integer default 0,
  active boolean default true,
  created_at timestamp with time zone default now(),
  primary key (id)
);

alter table public.agenda_services 
add column if not exists category_id uuid references public.agenda_service_categories(id) on delete set null;

create index if not exists agenda_service_categories_tenant_idx on public.agenda_service_categories(tenant_id);
create index if not exists agenda_services_category_idx on public.agenda_services(category_id);
