import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { getTenantHeaderInfo } from "@/server/tenant-headers";
import { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireTenantSession() {
  const supabase = getServerSupabase();
  // Use getUser instead of getSession for security and fresh metadata
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/login");
  }

  // Debug logs
  // console.log("[Auth] User:", user.email);

  const appMetadata = user.app_metadata || {};
  const userMetadata = user.user_metadata || {};
  
  // Prioritize app_metadata, fallback to user_metadata
  let tokenTenant = (appMetadata.tenant_id as string) || (userMetadata.tenant_id as string) || null;
  let isPlatformAdmin = false;

  // Fallback: If metadata is missing or to check admin status, check the database mapping
  // We generally check DB to confirm status
  const { data: rawUserRow } = await supabase
      .from("agenda_users")
      .select("tenant_id, is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();

  // @ts-ignore
  const userRow = rawUserRow as { tenant_id: string; is_platform_admin: boolean } | null;
      
  if (userRow) {
      if (!tokenTenant) tokenTenant = userRow.tenant_id;
      isPlatformAdmin = !!userRow.is_platform_admin;
  }

  if (!tokenTenant && !isPlatformAdmin) {
    // console.error("[Auth] Missing tenant_id in session metadata and DB");
    redirect("/login?reason=missing-tenant");
  }

  const headerInfo = getTenantHeaderInfo(headers());
  const impersonateId = cookies().get("agendar-impersonate-tenant")?.value;

  // Admin Override
  if (isPlatformAdmin && impersonateId) {
       // If using serviceClient, we must ensure it's available or fallback (though fallback will likely fail RLS)
       const adminClient = serviceClient ? serviceClient : supabase;
       return { supabase: adminClient, session: { user }, tenantId: impersonateId, isPlatformAdmin: true };
  }

  if (headerInfo.internalId && headerInfo.internalId !== tokenTenant && !headerInfo.isDevBypass) {
    redirect("/login?reason=tenant-mismatch");
  }

  return { supabase, session: { user }, tenantId: tokenTenant };
}
