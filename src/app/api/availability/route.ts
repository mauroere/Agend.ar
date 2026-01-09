import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";
import { serviceClient } from "@/lib/supabase/service";
import { AvailabilityError, getAvailabilitySlots } from "@/server/availability/getSlots";

type RouteClient = ReturnType<typeof getRouteSupabase>;

export async function GET(request: NextRequest) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  const tenantId = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id;

  if (!auth.session || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const locationId = searchParams.get("locationId");
  const durationStr = searchParams.get("duration");
  const providerId = searchParams.get("providerId");

  if (!dateStr || !locationId) {
    return NextResponse.json({ error: "Date and Location required" }, { status: 400 });
  }

  const duration = Number.parseInt(durationStr ?? "30", 10);
  const db: RouteClient = (serviceClient ?? supabase) as RouteClient;

  try {
    console.log(`[Availability] Request for date=${dateStr} loc=${locationId} prov=${providerId}`);
    const slots = await getAvailabilitySlots({
      db,
      tenantId,
      date: dateStr,
      locationId,
      durationMinutes: duration,
      providerId,
    });
    console.log(`[Availability] Found ${slots.length} slots`);

    return NextResponse.json({ slots });
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("availability.private_unexpected_error", error);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
