import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";
import { getTenantHeaderInfo } from "@/server/tenant-headers";

export async function GET(request: NextRequest) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  const tokenTenant = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (auth.session?.user?.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;
  const headerInfo = getTenantHeaderInfo(request.headers as Headers);
  const tenantId = tokenTenant ?? headerInfo.internalId;
  if (!auth.session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (headerInfo.internalId && tokenTenant && headerInfo.internalId !== tokenTenant && !headerInfo.isDevBypass) {
    return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("agenda_locations")
    .select("id, name, timezone, default_duration, buffer_minutes")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ locations: data ?? [] });
}
