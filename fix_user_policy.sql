-- Permitir que el usuario lea su propia fila en agenda_users sin depender del claim tenant_id
-- Esto habilita que el frontend sepa el rol y el tenant_id del usuario logueado.

DROP POLICY IF EXISTS agenda_users_read_own ON public.agenda_users;

CREATE POLICY agenda_users_read_own ON public.agenda_users
FOR SELECT
TO authenticated
USING (id = auth.uid());
