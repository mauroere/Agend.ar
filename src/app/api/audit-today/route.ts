
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { getRouteSupabase } from "@/lib/supabase/route";

export async function GET(request: Request) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  
  // Extract tenant info manually to be sure
  const tenantId = (auth.session?.user?.app_metadata as any)?.tenant_id ?? 
                   (auth.session?.user?.user_metadata as any)?.tenant_id;

  const { searchParams } = new URL(request.url);
  const debugDate = searchParams.get("date") ?? new Date().toISOString(); 

  const db = serviceClient;

  // 1. Get raw appointments (last 7 days to next 7 days)
  const now = new Date();
  const startRange = new Date(now); startRange.setDate(now.getDate() - 2);
  const endRange = new Date(now); endRange.setDate(now.getDate() + 2);

  const { data: allAppointments } = await db!
    .from("agenda_appointments")
    .select("id, start_at, location_id, tenant_id, status")
    .eq("tenant_id", tenantId)
    .gte("start_at", startRange.toISOString())
    .lte("start_at", endRange.toISOString());

  // 2. Get active location info
  const { data: locations } = await db!
    .from("agenda_locations")
    .select("*")
    .eq("tenant_id", tenantId);

  return NextResponse.json({
    tenantId,
    serverTimeISO: new Date().toISOString(),
    filterRange: { start: startRange.toISOString(), end: endRange.toISOString() },
    locations,
    appointmentsFound: allAppointments?.length,
    appointments: allAppointments
  });
}
