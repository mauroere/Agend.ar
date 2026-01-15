CREATE OR REPLACE FUNCTION public.agenda_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$function$;