import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";
import type { Database } from "@/types/database";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing waitlist id" }, { status: 400 });

  const payload: Database["public"]["Tables"]["agenda_waitlist"]["Update"] = {
    active: false,
  };

  const { error } = await supabase
    .from("agenda_waitlist")
    // @ts-ignore
    .update(payload)
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
