-- Migration: Restrict Appointment Visibility for Staff/Providers
-- Audited Issue: Staff/Providers were seeing all tenant appointments because the RLS policy was just 'tenant_id = current'.
-- Fix: Restrict SELECT based on Role (Owner sees all) and Provider Link (Staff sees Own).

-- 1. Drop the overly permissive 'ALL' policy
DROP POLICY IF EXISTS agenda_tenant_access_appointments ON public.agenda_appointments;

-- 2. Create specific policies
-- INSERT: Allow creating appointments in the tenant (needed for receptionists/self-booking)
CREATE POLICY agenda_tenant_insert_appointments ON public.agenda_appointments FOR INSERT
WITH CHECK (
    tenant_id = public.agenda_current_tenant_id()
);

-- DELETE: Allow deleting (maybe restrict to own later, but for now allow tenant level like before to avoid breaking delete)
CREATE POLICY agenda_tenant_delete_appointments ON public.agenda_appointments FOR DELETE
USING (
    tenant_id = public.agenda_current_tenant_id()
);

-- UPDATE: Allow updating (similar to delete)
CREATE POLICY agenda_tenant_update_appointments ON public.agenda_appointments FOR UPDATE
USING (
    tenant_id = public.agenda_current_tenant_id()
)
WITH CHECK (
    tenant_id = public.agenda_current_tenant_id()
);

-- SELECT: THE CRITICAL FIX
-- Owners see ALL.
-- Staff see ONLY their assigned appointments OR unassigned ones.
CREATE POLICY agenda_tenant_select_appointments ON public.agenda_appointments FOR SELECT
USING (
    tenant_id = public.agenda_current_tenant_id()
    AND (
        -- Permitir si es Owner OR Platform Admin (if we support that)
        EXISTS (
            SELECT 1 FROM public.agenda_users au
            WHERE au.id = auth.uid() 
            AND au.role = 'owner'
            -- We assume agenda_users has RLS that allows reading own row, checking role.
        )
        OR
        -- Permitir si es el Provider asignado
        provider_id IN (
            SELECT id FROM public.agenda_providers ap
            WHERE ap.user_id = auth.uid()
        )
        OR
        -- Permitir si no tiene provider asignado (Turnos "libres" o "sin asignar")
        provider_id IS NULL
    )
);

-- Ensure agenda_providers has a policy that allows reading by tenant
-- (Usually it does, but good to verify or ensure)
-- If agenda_providers RLS blocks reading, the subquery above returns null.
-- We assume "agenda_prefix" migration set RLS on providers to 'tenant_id = current'.
