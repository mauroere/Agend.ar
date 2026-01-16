import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient, Session } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabase/route";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";
import { getTenantHeaderInfo } from "@/server/tenant-headers";

export type TenantContextSuccess = {
  supabase: SupabaseClient<Database>;
  db: SupabaseClient<Database>;
  tenantId: string;
  session: Session;
  isPlatformAdmin?: boolean;
};

export type TenantContextFailure = {
  error: NextResponse;
};

type TenantContext = TenantContextSuccess | TenantContextFailure;

export async function getRouteTenantContext(request: NextRequest): Promise<TenantContext> {
  const supabase = getRouteSupabase() as unknown as SupabaseClient<Database>;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const db = (serviceClient as SupabaseClient<Database> | null) ?? supabase;

  // Fetch full profile to check for super admin status
  const { data: userRow } = await db
    .from("agenda_users")
    .select("tenant_id, is_platform_admin")
    .eq("id", session.user.id)
    .maybeSingle();

  let tenantId =
    (session.user.app_metadata as Record<string, string> | undefined)?.tenant_id ??
    (session.user.user_metadata as Record<string, string> | undefined)?.tenant_id ??
    null;

  if (!tenantId && userRow) {
    tenantId = userRow.tenant_id;
  }
  
  // Super Admin Impersonation Logic
  const isPlatformAdmin = !!userRow?.is_platform_admin;
  
  // Allow override via Header (API calls) or Cookie (UI navigation)
  const adminOverrideId = request.headers.get("x-admin-tenant-id") ?? request.cookies.get("agendar-impersonate-tenant")?.value;

  if (isPlatformAdmin && adminOverrideId) {
     return { supabase, db, tenantId: adminOverrideId, session, isPlatformAdmin: true };
  }

  const headerInfo = getTenantHeaderInfo(request.headers as Headers);
  const finalTenantId = tenantId ?? headerInfo.internalId ?? null;

  if (!finalTenantId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (headerInfo.internalId && tenantId && headerInfo.internalId !== tenantId && !headerInfo.isDevBypass) {
    // GOD MODE: If user is platform admin, allow access to any tenant
    if (isPlatformAdmin) {
        return { supabase, db, tenantId: headerInfo.internalId, session, isPlatformAdmin: true };
    }
    
    return { error: NextResponse.json({ error: "Tenant mismatch" }, { status: 403 }) };
  }

  return { supabase, db, tenantId: finalTenantId, session, isPlatformAdmin };
}
