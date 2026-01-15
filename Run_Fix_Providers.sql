-- Fix: Add user_id to providers if missing to link profiles to logins
alter table public.agenda_providers
add column if not exists user_id uuid references public.agenda_users (id) on delete set null;

-- This allows us to know "Provider X" is actually "User Login Y" to find their Google Token.