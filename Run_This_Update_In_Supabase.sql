-- Run this SQL in your Supabase SQL Editor to enable the Service Categories feature

-- 1. Create the categories table
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

-- 2. Add the category_id column to the services table
-- We use 'if not exists' to avoid errors if you run it multiple times
alter table public.agenda_services 
add column if not exists category_id uuid references public.agenda_service_categories(id) on delete set null;

-- 3. Create indexes for performance
create index if not exists agenda_service_categories_tenant_idx on public.agenda_service_categories(tenant_id);
create index if not exists agenda_services_category_idx on public.agenda_services(category_id);
