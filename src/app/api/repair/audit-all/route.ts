
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { getRouteSupabase } from "@/lib/supabase/route";

export async function GET(request: Request) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  const tenantId = (auth.session?.user?.app_metadata as any)?.tenant_id ?? (auth.session?.user?.user_metadata as any)?.tenant_id;

  const db = serviceClient ?? supabase;

  // GetAll appointments for this tenant, no date filter, just limit 50 recent
  const { data: allAppointments } = await db
    .from("agenda_appointments")
    .select("id, start_at, end_at, status, location_id, created_at")
    .eq("tenant_id", tenantId)
    .order("start_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    tenantId,
    count: allAppointments?.length,
    appointments: allAppointments?.map(a => ({
        id: a.id,
        start: a.start_at,
        loc: a.location_id
    }))
  });
}
