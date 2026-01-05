import { NextRequest, NextResponse } from "next/server";
import { addMinutes, differenceInMinutes } from "date-fns";
import { SupabaseClient } from "@supabase/supabase-js";
import { isWithinBusinessHours } from "@/lib/scheduling";
import { getRouteSupabase } from "@/lib/supabase/route";
import { Database } from "@/types/database";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];
type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type LocationRow = Database["public"]["Tables"]["locations"]["Row"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

  const appointmentId = params.id;
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });
  }

  const body = await request.json();
  const { patient, phone, start, duration, service, notes, location_id } = body ?? {};

  if (!patient || !phone || !start) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  const { data: existingAppt, error: fetchError } = await supabase
    .from("appointments")
    .select("id, tenant_id, location_id, start_at, end_at, status, patient_id")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .single();

  const typedExisting = existingAppt as
    | Pick<AppointmentRow, "id" | "tenant_id" | "location_id" | "start_at" | "end_at" | "status" | "patient_id">
    | null;

  if (fetchError || !typedExisting) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const startAt = new Date(start);
  if (!Number.isFinite(startAt.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const existingDuration = differenceInMinutes(new Date(typedExisting.end_at), new Date(typedExisting.start_at));
  const durationMinutes = Math.max(5, Number.isFinite(Number(duration)) ? Number(duration) : existingDuration || 30);
  const endAt = addMinutes(startAt, durationMinutes);

  const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;

  const { data: existingPatient } = await supabase
    .from("patients")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone_e164", normalizedPhone)
    .maybeSingle();

  const typedPatient = existingPatient as Pick<PatientRow, "id"> | null;

  let patientId: string | null = typedPatient?.id ?? typedExisting.patient_id ?? null;
  if (!patientId) {
    const patientInsert = {
      tenant_id: tenantId,
      full_name: patient,
      phone_e164: normalizedPhone,
      opt_out: false,
    } satisfies Database["public"]["Tables"]["patients"]["Insert"];

    const { data: inserted, error: patientError } = await supabase
      .from("patients")
      .insert(patientInsert)
      .select("id")
      .single();
    if (patientError) return NextResponse.json({ error: patientError.message }, { status: 400 });
    patientId = (inserted as Pick<PatientRow, "id">).id;
  } else {
    await supabase.from("patients").update({ full_name: patient }).eq("id", patientId).eq("tenant_id", tenantId);
  }

  let locationId: string | null = location_id ?? typedExisting.location_id ?? null;
  let locationTimezone = "America/Argentina/Buenos_Aires";
  let bufferMinutes = 0;
  let businessHours: Record<string, [string, string][]> = {};

  if (locationId) {
    const { data: locationRow } = await supabase
      .from("locations")
      .select("id, timezone, buffer_minutes, business_hours")
      .eq("tenant_id", tenantId)
      .eq("id", locationId)
      .maybeSingle();
    const typedLocation = locationRow as
      | Pick<LocationRow, "id" | "timezone" | "buffer_minutes" | "business_hours">
      | null;
    if (typedLocation) {
      locationTimezone = typedLocation.timezone;
      bufferMinutes = typedLocation.buffer_minutes ?? 0;
      businessHours = (typedLocation.business_hours as Record<string, [string, string][]>) ?? {};
    }
  }

  if (!locationId) {
    const { data: fallback } = await supabase
      .from("locations")
      .select("id, timezone, buffer_minutes, business_hours")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle();
    const typedFallback = fallback as
      | Pick<LocationRow, "id" | "timezone" | "buffer_minutes" | "business_hours">
      | null;
    if (typedFallback) {
      locationId = typedFallback.id;
      locationTimezone = typedFallback.timezone;
      bufferMinutes = typedFallback.buffer_minutes ?? 0;
      businessHours = (typedFallback.business_hours as Record<string, [string, string][]>) ?? {};
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
    .from("appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .neq("status", "canceled")
    .neq("id", appointmentId)
    .lt("start_at", conflictWindowEnd.toISOString())
    .gt("end_at", conflictWindowStart.toISOString())
    .limit(1);

  if (conflictError) return NextResponse.json({ error: conflictError.message }, { status: 400 });
  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: "Ya hay un turno en ese horario" }, { status: 409 });
  }

  const updatePayload = {
    location_id: locationId,
    patient_id: patientId,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    service_name: service ?? null,
    internal_notes: notes ?? null,
  } satisfies AppointmentUpdate;

  const { error: updateError, data: updated } = await supabase
    .from("appointments")
    .update(updatePayload)
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .select("id, start_at, end_at, status")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  return NextResponse.json({ ok: true, appointment: updated });
}
