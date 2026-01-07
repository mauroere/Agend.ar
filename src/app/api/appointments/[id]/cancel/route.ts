import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";
import type { Database } from "@/types/database";
import { getTenantHeaderInfo } from "@/server/tenant-headers";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
  const appointmentId = params.id;
  if (!appointmentId) return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });

  const payload: Database["public"]["Tables"]["agenda_appointments"]["Update"] = {
    status: "canceled",
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
