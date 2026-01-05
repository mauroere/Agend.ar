import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";
import type { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  const tokenTenant = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (auth.session?.user?.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;
  const headerTenant = request.headers.get("x-tenant-id");
  const tenantId = tokenTenant ?? headerTenant;
  if (!auth.session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (headerTenant && tokenTenant && headerTenant !== tokenTenant) {
    return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
  }
  const body = await request.json();
  const { defaultDuration, bufferMinutes } = body ?? {};

  if (typeof defaultDuration !== "number" || typeof bufferMinutes !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  type LocationId = Pick<Database["public"]["Tables"]["agenda_locations"]["Row"], "id">;

  const { data: location } = await supabase
    .from("agenda_locations")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle<LocationId>();

  if (!location?.id) {
    return NextResponse.json({ error: "No location found" }, { status: 404 });
  }

  const payload: Database["public"]["Tables"]["agenda_locations"]["Update"] = {
    default_duration: defaultDuration,
    buffer_minutes: bufferMinutes,
  };

  const { error } = await supabase
    .from("agenda_locations")
    // @ts-ignore
    .update(payload)
    .eq("id", location.id)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
