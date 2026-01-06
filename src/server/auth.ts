import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export async function requireTenantSession() {
  const supabase = getServerSupabase();
  // Use getUser instead of getSession for security and fresh metadata
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/login");
  }

  // Debug logs
  console.log("[Auth] User:", user.email);
  console.log("[Auth] App Metadata:", user.app_metadata);
  console.log("[Auth] User Metadata:", user.user_metadata);

  const appMetadata = user.app_metadata || {};
  const userMetadata = user.user_metadata || {};
  
  // Prioritize app_metadata, fallback to user_metadata
  let tokenTenant = (appMetadata.tenant_id as string) || (userMetadata.tenant_id as string) || null;

  // Fallback: If metadata is missing, check the database mapping
  if (!tokenTenant) {
    console.log("[Auth] Metadata missing tenant_id, checking DB...");
    const { data: rawUserRow } = await supabase
      .from("agenda_users")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    const userRow = rawUserRow as { tenant_id: string } | null;
      
    if (userRow) {
      tokenTenant = userRow.tenant_id;
      console.log("[Auth] Found tenant_id in DB:", tokenTenant);
    }
  }

  if (!tokenTenant) {
    console.error("[Auth] Missing tenant_id in session metadata and DB");
    // If we are in dev, maybe we can auto-fix or just fail
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

  return { supabase, session: { user }, tenantId: tokenTenant };
}
