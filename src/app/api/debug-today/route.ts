
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { getRouteSupabase } from "@/lib/supabase/route";

export async function GET(request: Request) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  
  // Extract tenant info manually to be sure
  const tenantId = (auth.session?.user?.app_metadata as any)?.tenant_id ?? 
                   (auth.session?.user?.user_metadata as any)?.tenant_id;

  const db: any = serviceClient ?? supabase;

  // 1. Get raw appointments (last 30 days to next 30 days) to see what exists
  const now = new Date();
  const startRange = new Date(now); startRange.setDate(now.getDate() - 30);
  const endRange = new Date(now); endRange.setDate(now.getDate() + 30);

  const { data: allAppointments } = await db
    .from("agenda_appointments")
    .select("id, start_at, end_at, status, location_id, tenant_id")
    .eq("tenant_id", tenantId)
    .gte("start_at", startRange.toISOString())
    .lte("start_at", endRange.toISOString());

  // 2. Get active location info
  const { data: locations } = await db
    .from("agenda_locations")
    .select("*")
    .eq("tenant_id", tenantId);

  return NextResponse.json({
    tenantId,
    serverTimeISO: now.toISOString(),
    filterRange: { start: startRange.toISOString(), end: endRange.toISOString() },
    locations,
    appointmentsFoundCount: allAppointments?.length,
    appointmentsSample: allAppointments
  });
}
