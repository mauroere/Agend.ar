import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { AvailabilityError, getAvailabilitySlots } from "@/server/availability/getSlots";

export async function GET(request: NextRequest) {
  if (!serviceClient) {
    return NextResponse.json({ error: "Service client is not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const dateStr = searchParams.get("date");
  const locationId = searchParams.get("locationId");
  const durationStr = searchParams.get("duration");
  const providerId = searchParams.get("providerId");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });
  }

  if (!dateStr || !locationId) {
    return NextResponse.json({ error: "Date and Location required" }, { status: 400 });
  }

  const duration = Number.parseInt(durationStr ?? "30", 10);

  try {
    const slots = await getAvailabilitySlots({
      db: serviceClient,
      tenantId,
      date: dateStr,
      locationId,
      durationMinutes: duration,
      providerId,
    });

    return NextResponse.json({ slots });
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("availability.public_unexpected_error", error);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
