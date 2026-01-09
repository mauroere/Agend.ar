import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";
import { serviceClient } from "@/lib/supabase/service";
import { AvailabilityError, findNextAvailableSlots } from "@/server/availability/getSlots";

type RouteClient = ReturnType<typeof getRouteSupabase>;

export async function GET(request: NextRequest) {
  const supabase = getRouteSupabase();
  const { data: auth } = await supabase.auth.getSession();
  const tenantId = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id;

  if (!auth.session || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const durationStr = searchParams.get("duration");
  const providerId = searchParams.get("providerId");
  const fromDateStr = searchParams.get("fromDate");

  if (!locationId) {
    return NextResponse.json({ error: "Location required" }, { status: 400 });
  }

  const duration = Number.parseInt(durationStr ?? "30", 10);
  const db: RouteClient = (serviceClient ?? supabase) as RouteClient;

  // Default to today if not provided
  const fromDate = fromDateStr ?? new Date().toISOString();

  try {
    const suggestions = await findNextAvailableSlots({
      db,
      tenantId,
      fromDate,
      locationId,
      durationMinutes: duration,
      providerId,
      limit: 3, // Find top 3 days with availability
      daysToScan: 14 // Scan up to 2 weeks
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("availability.suggest_unexpected_error", error);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
