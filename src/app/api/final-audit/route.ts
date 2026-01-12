
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { getRouteSupabase } from "@/lib/supabase/route";

export async function GET(request: Request) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  const tenantId = (auth.session?.user?.app_metadata as any)?.tenant_id;
  
  if (!tenantId) return NextResponse.json({ error: "No tenant" });

  const db = serviceClient ?? supabase;

  // RAW DUMP of everything for this tenant
  const { data: all_appts } = await db
    .from("agenda_appointments")
    .select("id, start_at, location_id, status")
    .eq("tenant_id", tenantId)
    .order("start_at", { ascending: false })
    .limit(100);

  return NextResponse.json({
    tenantId,
    now: new Date().toISOString(),
    appointments: all_appts
  });
}
