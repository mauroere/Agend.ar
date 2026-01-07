import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabase/route";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";
import { AppointmentCreationError, createAppointmentForTenant } from "@/server/appointments/createAppointment";

export async function POST(request: NextRequest) {
  const supabase = getRouteSupabase() as unknown as SupabaseClient<Database>;
  const { data: auth } = await supabase.auth.getSession();
  const tokenTenant = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (auth.session?.user?.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;
  const headerTenant = request.headers.get("x-tenant-id");
  const tenantId = tokenTenant ?? headerTenant;

  if (!auth.session || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isDev = process.env.NODE_ENV === "development";
  const isDefaultTenant = headerTenant === "tenant_1";
  if (headerTenant && tokenTenant && headerTenant !== tokenTenant) {
    if (!isDev || !isDefaultTenant) {
      return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
    }
  }

  // Use serviceClient for DB operations to bypass RLS in dev/mismatch scenarios
  const db = serviceClient ?? supabase;

  const body = await request.json();
  const { patient, phone, start, duration, service, notes, location_id, serviceId, providerId } = body ?? {};

  try {
    const { appointment } = await createAppointmentForTenant({
      db,
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

    console.error("appointment.create_unexpected_error", error);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
