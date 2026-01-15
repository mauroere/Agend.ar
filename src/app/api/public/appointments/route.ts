import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { AppointmentCreationError, createAppointmentForTenant } from "@/server/appointments/createAppointment";
import { getTenantHeaderInfo } from "@/server/tenant-headers";
import { resolveTenantIdFromPublicIdentifier } from "@/server/tenant-routing";

export async function POST(request: NextRequest) {
  if (!serviceClient) {
    return NextResponse.json({ error: "Service client is not configured" }, { status: 500 });
  }

  const body = await request.json();
  const headerInfo = getTenantHeaderInfo(request.headers as Headers);
  const {
    tenantId: tenantParam,
    tenantSlug,
    patient,
    phone,
    email,
    start,
    duration,
    service,
    notes,
    location_id,
    serviceId,
    providerId,
  } = body ?? {};

  const tenantId = headerInfo.internalId
    ?? (await resolveTenantIdFromPublicIdentifier({ tenantId: tenantParam, tenantSlug: tenantSlug ?? tenantParam }));

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant requerido" }, { status: 400 });
  }

  if (headerInfo.internalId && headerInfo.internalId !== tenantId && !headerInfo.isDevBypass) {
    return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
  }

  try {
    const { appointment } = await createAppointmentForTenant({
      db: serviceClient,
      tenantId,
      input: {
        patient,
        phone,
        email: email ?? null,
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
