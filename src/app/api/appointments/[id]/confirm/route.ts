import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";
import type { Database } from "@/types/database";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  const tokenTenant = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (auth.session?.user?.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;
  const headerTenant = _request.headers.get("x-tenant-id");
  const tenantId = tokenTenant ?? headerTenant;
  if (!auth.session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const isDev = process.env.NODE_ENV === "development";
  const isDefaultTenant = headerTenant === "tenant_1";
  if (headerTenant && tokenTenant && headerTenant !== tokenTenant) {
    if (!isDev || !isDefaultTenant) {
      return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
    }
  }
  const appointmentId = params.id;
  if (!appointmentId) return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });

  const payload: Database["public"]["Tables"]["agenda_appointments"]["Update"] = {
    status: "confirmed",
  };

  const { error } = await supabase
    .from("agenda_appointments")
    // @ts-ignore
    .update(payload)
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
