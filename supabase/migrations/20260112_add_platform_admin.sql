-- Add is_platform_admin column to agenda_users table
alter table public.agenda_users 
add column if not exists is_platform_admin boolean default false;

-- Create an index just in case we need to query admins
create index if not exists agenda_users_is_platform_admin_idx on public.agenda_users(is_platform_admin);

-- Policy update might be required depending on RLS, but usually service_role bypasses it. 
-- Standard users should not be able to read this column or at least not update it.
-- (Assuming standard RLS setup where users only modify self)
