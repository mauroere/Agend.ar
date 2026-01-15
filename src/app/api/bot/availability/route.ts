import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { getAvailabilitySlots } from "@/server/availability/getSlots";

// GET /api/bot/availability?tenantId=...&date=YYYY-MM-DD&serviceId=...&locationId=...
export async function GET(request: NextRequest) {
  if (!serviceClient) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  
  // Optional params
  const locationIdParam = searchParams.get("locationId");
  const providerIdRaw = searchParams.get("providerId");
  const providerId = providerIdRaw ? providerIdRaw : null;

  if (!tenantId || !date || (!serviceId && !searchParams.get("duration"))) {
    return NextResponse.json({ error: "Missing required params (tenantId, date, serviceId)" }, { status: 400 });
  }

  let locationId = locationIdParam;
  let duration = searchParams.get("duration") ? parseInt(searchParams.get("duration")!, 10) : 30;

  // If serviceId provided, get duration and maybe limits
  if (serviceId) {
    const { data: service } = await serviceClient
        .from("agenda_services")
        .select("duration_minutes")
        .eq("id", serviceId)
        .single();
    
    if (service) {
        duration = service.duration_minutes;
    }
  }

  // If no location provided, grab the first one
  if (!locationId) {
    const { data: loc } = await serviceClient
        .from("agenda_locations")
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(1)
        .single();
    locationId = loc?.id ?? null;
  }

  if (!locationId) {
     return NextResponse.json({ error: "No location found for tenant" }, { status: 404 });
  }

  try {
    const slots = await getAvailabilitySlots({
        db: serviceClient,
        tenantId,
        date,
        locationId,
        durationMinutes: duration,
        providerId
    });

    return NextResponse.json({ 
        date,
        slots,
        hasSlots: slots.length > 0
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
