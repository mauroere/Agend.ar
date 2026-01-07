import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { AppointmentCreationError, createAppointmentForTenant } from "@/server/appointments/createAppointment";

export async function POST(request: NextRequest) {
  if (!serviceClient) {
    return NextResponse.json({ error: "Service client is not configured" }, { status: 500 });
  }

  const body = await request.json();
  const {
    tenantId,
    patient,
    phone,
    start,
    duration,
    service,
    notes,
    location_id,
    serviceId,
    providerId,
  } = body ?? {};

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });
  }

  try {
    const { appointment } = await createAppointmentForTenant({
      db: serviceClient,
      tenantId,
      input: {
        patient,
        phone,
        start,
        duration,
        serviceName: service ?? null,
        notes: notes ?? null,
        locationId: location_id ?? null,
        serviceId: serviceId ?? null,
        providerId: providerId ?? null,
      },
    });

    return NextResponse.json({ ok: true, appointment });
  } catch (error) {
    if (error instanceof AppointmentCreationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("public.appointment.create_unexpected_error", error);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
