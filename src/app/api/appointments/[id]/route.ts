import { NextRequest, NextResponse } from "next/server";
import { addMinutes, differenceInMinutes } from "date-fns";
import { SupabaseClient } from "@supabase/supabase-js";
import { isWithinBusinessHours } from "@/lib/scheduling";
import { getRouteSupabase } from "@/lib/supabase/route";
import { serviceClient } from "@/lib/supabase/service";
import { normalizePhoneNumber } from "@/lib/normalization";
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
  const { patient, phone, start, duration, service, notes, location_id, serviceId, providerId, status } = body ?? {};
  const payload = (body ?? {}) as Record<string, unknown>;
  const hasServiceId = Object.prototype.hasOwnProperty.call(payload, "serviceId");
  const hasProviderId = Object.prototype.hasOwnProperty.call(payload, "providerId");

  // If we are just updating status, we might not need everything else, but for now let's keep validation loose or check context
  if ((!patient || !phone || !start) && !status) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  const { data: existingAppt, error: fetchError } = await db
    .from("agenda_appointments")
    .select(
      "id, tenant_id, location_id, start_at, end_at, status, patient_id, service_name" // Removed provider_id, service_id, snapshot
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
        | "service_name"
      >
    | null;

  if (fetchError || !typedExisting) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  // Handle status-only update immediately if other fields are missing
  if (status && (!patient && !start)) {
      const { error: updateError } = await db
        .from("agenda_appointments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("tenant_id", tenantId);

      if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, id: appointmentId });
  }

  const startAt = new Date(start);
  if (!Number.isFinite(startAt.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const existingDuration = differenceInMinutes(new Date(typedExisting.end_at), new Date(typedExisting.start_at));

  const normalizedPhone = normalizePhoneNumber(phone);

  // PATCH: DB columns missing
  const nextServiceId: string | null = hasServiceId ? (serviceId ?? null) : null; // typedExisting.service_id ?? null;
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

  const nextProviderId: string | null = hasProviderId ? (providerId ?? null) : null; 
  type ProviderLookup = Pick<ProviderRow, "id" | "tenant_id" | "full_name" | "active" | "default_location_id" | "metadata">;
  let resolvedProvider: ProviderLookup | null = null;
  if (nextProviderId) {
    const { data: providerRow, error: providerError } = await db
      .from("agenda_providers")
      .select("id, tenant_id, full_name, active, default_location_id, metadata")
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

  // 1. Check Provider Override (similar to createAppointment)
  if (resolvedProvider) {
     const provSchedule = (resolvedProvider.metadata as any)?.schedule;
     if (provSchedule && Object.keys(provSchedule).length > 0) {
        businessHours = provSchedule;
     }
  }

  // 2. Fallback default hours if empty
  if (Object.keys(businessHours).length === 0) {
    businessHours = {
      mon: [["09:00", "18:00"]],
      tue: [["09:00", "18:00"]],
      wed: [["09:00", "18:00"]],
      thu: [["09:00", "18:00"]],
      fri: [["09:00", "18:00"]],
    };
  }

  const validHours = isWithinBusinessHours({
    start: startAt,
    end: endAt,
    businessHours,
    timeZone: locationTimezone,
  });

  if (!validHours) {
    const debugInfo = `Start: ${startAt.toISOString()}, LocTZ: ${locationTimezone}, LocalDay: ${new Intl.DateTimeFormat("en-US", { timeZone: locationTimezone, weekday: "short", hour: 'numeric' }).format(startAt)}`;
    console.error(`[AppointmentPatchError] Outside Business Hours. ${debugInfo}`);
    return NextResponse.json({ error: `Fuera del horario de atención (${debugInfo})` }, { status: 400 });
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

  /*
  if (nextProviderId) {
    conflictQuery = conflictQuery.or(`provider_id.eq.${nextProviderId},provider_id.is.null`);
  }
  */

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
      : null; // typedExisting.service_snapshot as AppointmentRow["service_snapshot"];

  const manualServiceName = typeof service === "string" && service.trim().length > 0 ? service.trim() : null;
  let serviceName = typedExisting.service_name ?? null;
  if (hasServiceId) {
    serviceName = resolvedService?.name ?? manualServiceName;
  } else if (manualServiceName) {
    serviceName = manualServiceName;
  }

  const updatePayload: AppointmentUpdate = {
    location_id: locationId,
    patient_id: patientId,
    start_at: startAt ? startAt.toISOString() : typedExisting.start_at,
    end_at: endAt ? endAt.toISOString() : typedExisting.end_at,
    service_name: serviceName,
    internal_notes: notes ?? null,
  };

  if (status) {
      updatePayload.status = status;
  }

  const { error: updateError, data: updated } = await db
    .from("agenda_appointments")
    .update(updatePayload)
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .select("id, start_at, end_at, status")
    .single();

  if (updateError) {
      if (updateError.code === "23P01" || updateError.message?.includes("agenda_chk_no_overlap")) {
           return NextResponse.json({ error: "El horario seleccionado ya está ocupado por otro turno (conflicto detectado)." }, { status: 409 });
      }
      return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, appointment: updated });
}
