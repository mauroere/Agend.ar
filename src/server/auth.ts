import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export async function requireTenantSession() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) redirect("/login");

  // Debug logs
  console.log("[Auth] User:", session.user.email);
  console.log("[Auth] App Metadata:", session.user.app_metadata);
  console.log("[Auth] User Metadata:", session.user.user_metadata);

  const appMetadata = session.user.app_metadata || {};
  const userMetadata = session.user.user_metadata || {};
  
  // Prioritize app_metadata, fallback to user_metadata
  const tokenTenant = (appMetadata.tenant_id as string) || (userMetadata.tenant_id as string) || null;

  if (!tokenTenant) {
    console.error("[Auth] Missing tenant_id in session metadata");
    redirect("/login?reason=missing-tenant");
  }

  const headerTenant = headers().get("x-tenant-id");
  
  // Allow localhost/development mismatch where header is default "tenant_1"
  const isDev = process.env.NODE_ENV === "development";
  const isDefaultTenant = headerTenant === "tenant_1";

  if (headerTenant && headerTenant !== tokenTenant) {
    if (isDev && isDefaultTenant) {
      // Allow access in dev mode even if tenant doesn't match default
    } else {
      redirect("/login?reason=tenant-mismatch");
    }
  }

  return { supabase, session, tenantId: tokenTenant };
}
