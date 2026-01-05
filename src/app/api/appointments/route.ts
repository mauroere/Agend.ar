import { NextRequest, NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { SupabaseClient } from "@supabase/supabase-js";
import { isWithinBusinessHours } from "@/lib/scheduling";
import { getRouteSupabase } from "@/lib/supabase/route";
import { Database } from "@/types/database";

type PatientRow = Database["public"]["Tables"]["agenda_patients"]["Row"];
type LocationRow = Database["public"]["Tables"]["agenda_locations"]["Row"];
type AppointmentInsert = Database["public"]["Tables"]["agenda_appointments"]["Insert"];

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

  if (headerTenant && tokenTenant && headerTenant !== tokenTenant) {
    return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
  }

  const body = await request.json();
  const { patient, phone, start, duration, service, notes, location_id } = body ?? {};

  if (!patient || !phone || !start) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const startAt = new Date(start);
  if (!Number.isFinite(startAt.getTime())) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  }

  const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;
  const durationMinutes = Math.max(5, Number(duration ?? 30));
  const endAt = addMinutes(startAt, durationMinutes);

  // Find or create patient
  const { data: existingPatient } = await supabase
    .from("agenda_patients")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone_e164", normalizedPhone)
    .maybeSingle();

  let patientId = (existingPatient as Pick<PatientRow, "id"> | null)?.id;
  if (!patientId) {
    const patientInsert = {
      tenant_id: tenantId,
      full_name: patient,
      phone_e164: normalizedPhone,
      opt_out: false,
    } satisfies Database["public"]["Tables"]["agenda_patients"]["Insert"];

    const { data: inserted, error: patientError } = await supabase
      .from("agenda_patients")
      .insert(patientInsert)
      .select("id")
      .single();
    if (patientError) return NextResponse.json({ error: patientError.message }, { status: 400 });
    patientId = (inserted as Pick<PatientRow, "id">).id;
  }

  let locationId: string | null = null;
  let locationTimezone = "America/Argentina/Buenos_Aires";
  let bufferMinutes = 0;
  let businessHours: Record<string, [string, string][]> = {};

  if (location_id) {
    const { data: locationRow } = await supabase
      .from("agenda_locations")
      .select("id, timezone, buffer_minutes, business_hours")
      .eq("tenant_id", tenantId)
      .eq("id", location_id)
      .maybeSingle();
    const typed = locationRow as Pick<LocationRow, "id" | "timezone" | "buffer_minutes" | "business_hours"> | null;
    if (typed) {
      locationId = typed.id;
      locationTimezone = typed.timezone;
      bufferMinutes = typed.buffer_minutes ?? 0;
      businessHours = (typed.business_hours as Record<string, [string, string][]>) ?? {};
    }
  }

  if (!locationId) {
    const { data: fallback } = await supabase
      .from("agenda_locations")
      .select("id, timezone, buffer_minutes, business_hours")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle();
    const typed = fallback as Pick<LocationRow, "id" | "timezone" | "buffer_minutes" | "business_hours"> | null;
    if (typed) {
      locationId = typed.id;
      locationTimezone = typed.timezone;
      bufferMinutes = typed.buffer_minutes ?? 0;
      businessHours = (typed.business_hours as Record<string, [string, string][]>) ?? {};
    }
  }

  if (!locationId) {
    return NextResponse.json({ error: "Debe crear una ubicación primero" }, { status: 400 });
  }

  const validHours = isWithinBusinessHours({
    start: startAt,
    end: endAt,
    businessHours,
    timeZone: locationTimezone,
  });

  if (!validHours) {
    return NextResponse.json({ error: "Fuera del horario de atención" }, { status: 400 });
  }

  const conflictWindowStart = addMinutes(startAt, -bufferMinutes);
  const conflictWindowEnd = addMinutes(endAt, bufferMinutes);

  const { data: conflicts, error: conflictError } = await supabase
    .from("agenda_appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .neq("status", "canceled")
    .lt("start_at", conflictWindowEnd.toISOString())
    .gt("end_at", conflictWindowStart.toISOString())
    .limit(1);

  if (conflictError) return NextResponse.json({ error: conflictError.message }, { status: 400 });
  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: "Ya hay un turno en ese horario" }, { status: 409 });
  }

  const appointmentInsert = {
    tenant_id: tenantId,
    location_id: locationId,
    patient_id: patientId,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: "pending",
    service_name: service ?? null,
    internal_notes: notes ?? null,
  } satisfies AppointmentInsert;

  const { error: apptError, data: appt } = await supabase
    .from("agenda_appointments")
    .insert(appointmentInsert)
    .select("id, start_at, end_at, status")
    .single();

  if (apptError) return NextResponse.json({ error: apptError.message }, { status: 400 });

  return NextResponse.json({ ok: true, appointment: appt });
}
