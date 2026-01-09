-- Ensure every tenant has a stable public_slug derived from its name.
-- Run with `npm run db:seed-slugs` (linked Supabase project required).
with slug_inputs as (
  select
    id,
    coalesce(public_slug,
      nullif(lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g')), ''),
      concat('tenant-', substring(id::text for 8))
    ) as slug_candidate
  from public.agenda_tenants
),
ranked_slugs as (
  select
    id,
    slug_candidate,
    row_number() over (partition by slug_candidate order by id) as dup_rank
  from slug_inputs
),
resolved_slugs as (
  select
    id,
    case when dup_rank > 1 then slug_candidate || '-' || dup_rank else slug_candidate end as slug_final
  from ranked_slugs
)
update public.agenda_tenants t
set public_slug = r.slug_final
from resolved_slugs r
where t.id = r.id
  and t.public_slug is null;