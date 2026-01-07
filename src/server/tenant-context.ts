import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient, Session } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabase/route";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";

export type TenantContextSuccess = {
  supabase: SupabaseClient<Database>;
  db: SupabaseClient<Database>;
  tenantId: string;
  session: Session;
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

  let tenantId =
    (session.user.app_metadata as Record<string, string> | undefined)?.tenant_id ??
    (session.user.user_metadata as Record<string, string> | undefined)?.tenant_id ??
    null;

  if (!tenantId) {
    const { data: userRow } = await db
      .from("agenda_users")
      .select("tenant_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (userRow) {
      tenantId = (userRow as { tenant_id: string }).tenant_id;
    }
  }

  const headerTenant = request.headers.get("x-tenant-id");
  const finalTenantId = tenantId ?? headerTenant;

  if (!finalTenantId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (headerTenant && tenantId && headerTenant !== tenantId) {
    const isDev = process.env.NODE_ENV === "development";
    const isDefaultTenant = headerTenant === "tenant_1";
    if (!isDev || !isDefaultTenant) {
      return { error: NextResponse.json({ error: "Tenant mismatch" }, { status: 403 }) };
    }
  }

  return { supabase, db, tenantId: finalTenantId, session };
}
