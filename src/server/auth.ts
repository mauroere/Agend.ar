import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export async function requireTenantSession() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) redirect("/login");

  const tokenTenant = (session.user.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (session.user.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;

  if (!tokenTenant) redirect("/login?reason=missing-tenant");

  const headerTenant = headers().get("x-tenant-id");
  if (headerTenant && headerTenant !== tokenTenant) {
    redirect("/login?reason=tenant-mismatch");
  }

  return { supabase, session, tenantId: tokenTenant };
}
