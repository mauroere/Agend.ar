import { NextRequest, NextResponse } from "next/server";
import { addMinutes, differenceInMinutes } from "date-fns";
import { SupabaseClient } from "@supabase/supabase-js";
import { isWithinBusinessHours } from "@/lib/scheduling";
import { getRouteSupabase } from "@/lib/supabase/route";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";
import { getTenantHeaderInfo } from "@/server/tenant-headers";

type AppointmentRow = Database["public"]["Tables"]["agenda_appointments"]["Row"];
type AppointmentUpdate = Database["public"]["Tables"]["agenda_appointments"]["Update"];
type PatientRow = Database["public"]["Tables"]["agenda_patients"]["Row"];
type LocationRow = Database["public"]["Tables"]["agenda_locations"]["Row"];
type ServiceRow = Database["public"]["Tables"]["agenda_services"]["Row"];
type ProviderRow = Database["public"]["Tables"]["agenda_providers"]["Row"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getRouteSupabase() as unknown as SupabaseClient<Database>;
  const { data: auth } = await supabase.auth.getSession();
  const tokenTenant = (auth.session?.user?.app_metadata as Record<string, string> | undefined)?.tenant_id
    ?? (auth.session?.user?.user_metadata as Record<string, string> | undefined)?.tenant_id
    ?? null;
  const headerInfo = getTenantHeaderInfo(request.headers as Headers);
  const tenantId = tokenTenant ?? headerInfo.internalId;

  if (!auth.session || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (headerInfo.internalId && tokenTenant && headerInfo.internalId !== tokenTenant && !headerInfo.isDevBypass) {
    return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });
  }

  // Use serviceClient for DB operations to bypass RLS in dev/mismatch scenarios
  const db = serviceClient ?? supabase;

  const appointmentId = params.id;
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });
  }

  const body = await request.json();
  const { patient, phone, start, duration, service, notes, location_id, serviceId, providerId } = body ?? {};
  const payload = (body ?? {}) as Record<string, unknown>;
  const hasServiceId = Object.prototype.hasOwnProperty.call(payload, "serviceId");
  const hasProviderId = Object.prototype.hasOwnProperty.call(payload, "providerId");

  if (!patient || !phone || !start) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  const { data: existingAppt, error: fetchError } = await db
    .from("agenda_appointments")
    .select(
      "id, tenant_id, location_id, start_at, end_at, status, patient_id, service_id, service_name, service_snapshot, provider_id"
    )
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .single();

  const typedExisting = existingAppt as
    | Pick<
        AppointmentRow,
        | "id"
        | "tenant_id"
        | "location_id"
        | "start_at"
        | "end_at"
        | "status"
        | "patient_id"
        | "service_id"
        | "service_name"
        | "service_snapshot"
        | "provider_id"
      >
    | null;

  if (fetchError || !typedExisting) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const startAt = new Date(start);
  if (!Number.isFinite(startAt.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const existingDuration = differenceInMinutes(new Date(typedExisting.end_at), new Date(typedExisting.start_at));

  const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;

  const nextServiceId: string | null = hasServiceId ? (serviceId ?? null) : typedExisting.service_id ?? null;
  type ServiceLookup = Pick<
    ServiceRow,
    "id" | "name" | "description" | "duration_minutes" | "price_minor_units" | "currency" | "color" | "active"
  >;
  let resolvedService: ServiceLookup | null = null;
  if (nextServiceId) {
    const { data: serviceRow, error: serviceError } = await db
      .from("agenda_services")
      .select("id, tenant_id, name, description, duration_minutes, price_minor_units, currency, color, active")
      .eq("tenant_id", tenantId)
      .eq("id", nextServiceId)
      .maybeSingle();

    if (serviceError || !serviceRow) {
      return NextResponse.json({ error: "Servicio inválido" }, { status: 400 });
    }

    if (!serviceRow.active) {
      return NextResponse.json({ error: "El servicio está pausado" }, { status: 400 });
    }

    resolvedService = serviceRow as ServiceLookup;
  }

  const nextProviderId: string | null = hasProviderId ? (providerId ?? null) : typedExisting.provider_id ?? null;
  type ProviderLookup = Pick<ProviderRow, "id" | "tenant_id" | "full_name" | "active" | "default_location_id">;
  let resolvedProvider: ProviderLookup | null = null;
  if (nextProviderId) {
    const { data: providerRow, error: providerError } = await db
      .from("agenda_providers")
      .select("id, tenant_id, full_name, active, default_location_id")
      .eq("tenant_id", tenantId)
      .eq("id", nextProviderId)
      .maybeSingle();

    if (providerError || !providerRow) {
      return NextResponse.json({ error: "Profesional inválido" }, { status: 400 });
    }

    if (!providerRow.active) {
      return NextResponse.json({ error: "El profesional está pausado" }, { status: 400 });
    }

    resolvedProvider = providerRow as ProviderLookup;
  }

  const durationSource = Number(
    duration ?? resolvedService?.duration_minutes ?? existingDuration ?? 30
  );
  const durationMinutes = Math.max(5, Number.isFinite(durationSource) ? durationSource : existingDuration || 30);
  const endAt = addMinutes(startAt, durationMinutes);

  const { data: existingPatient } = await db
    .from("agenda_patients")
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
    } satisfies Database["public"]["Tables"]["agenda_patients"]["Insert"];

    const { data: inserted, error: patientError } = await db
      .from("agenda_patients")
      .insert(patientInsert)
      .select("id")
      .single();
    if (patientError) return NextResponse.json({ error: patientError.message }, { status: 400 });
    patientId = (inserted as Pick<PatientRow, "id">).id;
  } else {
    await db.from("agenda_patients").update({ full_name: patient }).eq("id", patientId).eq("tenant_id", tenantId);
  }

  let locationId: string | null = location_id ?? typedExisting.location_id ?? resolvedProvider?.default_location_id ?? null;
  let locationTimezone = "America/Argentina/Buenos_Aires";
  let bufferMinutes = 0;
  let businessHours: Record<string, [string, string][]> = {};

  if (locationId) {
    const { data: locationRow } = await db
      .from("agenda_locations")
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
    const { data: fallback } = await db
      .from("agenda_locations")
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

  let conflictQuery = db
    .from("agenda_appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .neq("status", "canceled")
    .neq("id", appointmentId)
    .lt("start_at", conflictWindowEnd.toISOString())
    .gt("end_at", conflictWindowStart.toISOString());

  if (nextProviderId) {
    conflictQuery = conflictQuery.or(`provider_id.eq.${nextProviderId},provider_id.is.null`);
  }

  const { data: conflicts, error: conflictError } = await conflictQuery.limit(1);

  if (conflictError) return NextResponse.json({ error: conflictError.message }, { status: 400 });
  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: "Ya hay un turno en ese horario" }, { status: 409 });
  }

  const serviceSnapshot = resolvedService
    ? {
        id: resolvedService.id,
        name: resolvedService.name,
        description: resolvedService.description,
        duration_minutes: resolvedService.duration_minutes,
        price_minor_units: resolvedService.price_minor_units,
        currency: resolvedService.currency,
        color: resolvedService.color,
      }
    : hasServiceId
      ? null
      : (typedExisting.service_snapshot as AppointmentRow["service_snapshot"]);

  const manualServiceName = typeof service === "string" && service.trim().length > 0 ? service.trim() : null;
  let serviceName = typedExisting.service_name ?? null;
  if (hasServiceId) {
    serviceName = resolvedService?.name ?? manualServiceName;
  } else if (manualServiceName) {
    serviceName = manualServiceName;
  }

  const updatePayload = {
    location_id: locationId,
    patient_id: patientId,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    service_id: nextServiceId,
    provider_id: nextProviderId,
    service_name: serviceName,
    service_snapshot: serviceSnapshot,
    internal_notes: notes ?? null,
  } satisfies AppointmentUpdate;

  const { error: updateError, data: updated } = await db
    .from("agenda_appointments")
    .update(updatePayload)
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .select("id, start_at, end_at, status")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  return NextResponse.json({ ok: true, appointment: updated });
}
