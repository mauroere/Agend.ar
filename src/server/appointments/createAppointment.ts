import { addMinutes } from "date-fns";
import { normalizePhoneNumber } from "@/lib/normalization";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { isWithinBusinessHours } from "@/lib/scheduling";
import { sendTemplateMessage } from "@/lib/whatsapp";
import { TEMPLATE_NAMES } from "@/lib/messages";
import { getTenantTemplateMap, getWhatsAppIntegrationByTenant } from "@/server/whatsapp-config";
import { logError, logInfo } from "@/lib/logging";

type PatientRow = Database["public"]["Tables"]["agenda_patients"]["Row"];
type LocationRow = Database["public"]["Tables"]["agenda_locations"]["Row"];
type AppointmentInsert = Database["public"]["Tables"]["agenda_appointments"]["Insert"];
type AppointmentRow = Database["public"]["Tables"]["agenda_appointments"]["Row"];
type ServiceRow = Database["public"]["Tables"]["agenda_services"]["Row"];
type ProviderRow = Database["public"]["Tables"]["agenda_providers"]["Row"];

type ServiceLookup = Pick<
  ServiceRow,
  "id" | "name" | "description" | "duration_minutes" | "price_minor_units" | "currency" | "color" | "active"
>;

type ProviderLookup = Pick<ProviderRow, "id" | "tenant_id" | "full_name" | "active" | "default_location_id" | "metadata">;

type LocationLookup = Pick<LocationRow, "id" | "name" | "timezone" | "buffer_minutes" | "business_hours">;

export type AppointmentCreationInput = {
  patient: string;
  phone: string;
  email?: string; // Added
  start: string;
  duration?: number;
  serviceName?: string | null;
  notes?: string | null;
  locationId?: string | null;
  serviceId?: string | null;
  providerId?: string | null;
};

export class AppointmentCreationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

import { createGoogleCalendarEvent } from "@/server/integrations/google-calendar";

export async function createAppointmentForTenant(options: {
  db: SupabaseClient<Database>;
  tenantId: string;
  input: AppointmentCreationInput;
  sendNotifications?: boolean;
}) {
  const { db, tenantId, input, sendNotifications = true } = options;
  const { patient, phone, email, start, duration, serviceName, notes, locationId: rawLocationId, serviceId, providerId } = input;

  if (!patient || !phone || !start) {
    throw new AppointmentCreationError("Missing required fields", 400);
  }

  const startAt = new Date(start);
  if (!Number.isFinite(startAt.getTime())) {
    throw new AppointmentCreationError("Invalid start date", 400);
  }

  // Phone normalization using centralized utility
  const normalizedPhone = normalizePhoneNumber(phone);

  let resolvedService: ServiceLookup | null = null;
  if (serviceId) {
    const { data: serviceRow, error: serviceError } = await db
      .from("agenda_services")
      .select("id, tenant_id, name, description, duration_minutes, price_minor_units, currency, color, active")
      .eq("tenant_id", tenantId)
      .eq("id", serviceId)
      .maybeSingle();

    if (serviceError || !serviceRow) {
      throw new AppointmentCreationError("Servicio inválido", 400);
    }

    if (!serviceRow.active) {
      throw new AppointmentCreationError("El servicio está pausado", 400);
    }

    resolvedService = serviceRow as ServiceLookup;
  }

  let resolvedProvider: ProviderLookup | null = null;
  if (providerId) {
    const { data: providerRow, error: providerError } = await db
      .from("agenda_providers")
      .select("id, tenant_id, full_name, active, default_location_id, metadata")
      .eq("tenant_id", tenantId)
      .eq("id", providerId)
      .maybeSingle();

    if (providerError || !providerRow) {
      throw new AppointmentCreationError("Profesional inválido", 400);
    }

    if (!providerRow.active) {
      throw new AppointmentCreationError("El profesional está pausado", 400);
    }

    resolvedProvider = providerRow as ProviderLookup;
  } else {
    // Audit: Enforce provider assignment.
    // If no providerId is supplied, try to auto-assign the first available active provider.
    const { data: anyProvider } = await db
      .from("agenda_providers")
      .select("id, tenant_id, full_name, active, default_location_id, metadata")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    if (anyProvider) {
      resolvedProvider = anyProvider as ProviderLookup;
    } else {
      // If absolutely no providers exist, we might allow it (legacy) or fail.
      // Based on user request "asignar obligatoriamente", we should likely ensure one exists.
      // But for now, we'll proceed only if we found one.
      // throw new AppointmentCreationError("No hay profesionales disponibles para asignar el turno", 400); 
    }
  }

  const durationSource = Number(duration ?? resolvedService?.duration_minutes ?? 30);
  const durationMinutes = Math.max(5, Number.isFinite(durationSource) ? durationSource : 30);
  const endAt = addMinutes(startAt, durationMinutes);

  const { data: existingPatient } = await db
    .from("agenda_patients")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone_e164", normalizedPhone)
    .maybeSingle();

  let patientId = (existingPatient as Pick<PatientRow, "id"> | null)?.id ?? null;
  if (!patientId) {
    const insertPayload = {
      tenant_id: tenantId,
      full_name: patient,
      phone_e164: normalizedPhone,
      email: email && email.length > 0 ? email : null, // Added
      opt_out: false,
    } satisfies Database["public"]["Tables"]["agenda_patients"]["Insert"];

    const { data: inserted, error: patientError } = await db
      .from("agenda_patients")
      .insert(insertPayload)
      .select("id")
      .single();

    if (patientError) {
      throw new AppointmentCreationError(patientError.message, 400);
    }

    patientId = (inserted as Pick<PatientRow, "id">).id;
  } else {
    // Upsert email if provided
    const updatePayload: any = { full_name: patient };
    if (email && email.length > 0) updatePayload.email = email;
    
    await db.from("agenda_patients").update(updatePayload).eq("id", patientId).eq("tenant_id", tenantId);
  }

  let locationId: string | null = rawLocationId ?? resolvedProvider?.default_location_id ?? null;
  let locationName = "Consultorio";
  let locationTimezone = "America/Argentina/Buenos_Aires";
  let bufferMinutes = 0;
  let businessHours: Record<string, [string, string][]> = {};

  const assignLocation = (row: LocationLookup | null) => {
    if (row) {
      locationId = row.id;
      locationName = row.name;
      locationTimezone = row.timezone;
      bufferMinutes = row.buffer_minutes ?? 0;
      businessHours = (row.business_hours as Record<string, [string, string][]>) ?? {};
    } else {
      locationId = null;
    }
  };

  if (locationId) {
    const { data: locationRow } = await db
      .from("agenda_locations")
      .select("id, name, timezone, buffer_minutes, business_hours")
      .eq("tenant_id", tenantId)
      .eq("id", locationId)
      .maybeSingle();

    assignLocation((locationRow as LocationLookup | null) ?? null);
  }

  if (!locationId) {
    const { data: fallback } = await db
      .from("agenda_locations")
      .select("id, name, timezone, buffer_minutes, business_hours")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle();

    assignLocation((fallback as LocationLookup | null) ?? null);
  }

  if (!locationId) {
    throw new AppointmentCreationError("Debe crear una ubicación primero", 400);
  }

  // 1. Check Provider Override
  if (resolvedProvider) {
      const provSchedule = (resolvedProvider.metadata as any)?.schedule;
      if (provSchedule && Object.keys(provSchedule).length > 0) {
          businessHours = provSchedule;
      }
  }

  // 2. Fallback default hours if empty (Matches getSlots behavior)
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
    console.error(`[AppointmentError] Outside Business Hours. ${debugInfo}`);
    throw new AppointmentCreationError(`Fuera del horario de atención (${debugInfo})`, 400);
  }

  const conflictWindowStart = addMinutes(startAt, -bufferMinutes);
  const conflictWindowEnd = addMinutes(endAt, bufferMinutes);

  let conflictQuery = db
    .from("agenda_appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .neq("status", "canceled")
    .lt("start_at", conflictWindowEnd.toISOString())
    .gt("end_at", conflictWindowStart.toISOString());

  /*
  // Disabled until DB migration is applied
  if (resolvedProvider?.id) {
    conflictQuery = conflictQuery.or(`provider_id.eq.${resolvedProvider.id},provider_id.is.null`);
  }
  */

  const { data: conflicts, error: conflictError } = await conflictQuery.limit(1);

  if (conflictError) {
    throw new AppointmentCreationError(conflictError.message, 400);
  }

  if (conflicts && conflicts.length > 0) {
    throw new AppointmentCreationError("Ya hay un turno en ese horario", 409);
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
    : null;

  const normalizedServiceName = resolvedService?.name ?? (serviceName?.trim().length ? serviceName?.trim() : null);

  const appointmentInsert = {
    tenant_id: tenantId,
    location_id: locationId,
    patient_id: patientId,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: "pending",
    service_id: resolvedService?.id ?? null,
    provider_id: resolvedProvider?.id ?? null,
    service_name: normalizedServiceName,
    // service_snapshot: serviceSnapshot, // TODO: Run migration to add this column
    internal_notes: notes ?? null,
  } satisfies AppointmentInsert;

  const { error: apptError, data: appt } = await db
    .from("agenda_appointments")
    .insert(appointmentInsert)
    .select("id, start_at, end_at, status")
    .single();

  if (apptError) {
    if (apptError.code === "23P01" || apptError.message?.includes("agenda_chk_no_overlap")) {
      throw new AppointmentCreationError("El horario seleccionado ya está ocupado por otro turno (conflicto detectado).", 409);
    }
    throw new AppointmentCreationError(apptError.message, 400);
  }

  // Fire & Forget: Sync to Google Calendar
  if (providerId) {
     void createGoogleCalendarEvent(db, {
         ...appt as any, 
         agenda_patients: { full_name: patient },
         agenda_services: { name: (resolvedService?.name ?? serviceName ?? "Servicio") }
     }, providerId).catch(console.error);
  }

  if (sendNotifications) {
    try {
      const [credentials, templateMap] = await Promise.all([
        getWhatsAppIntegrationByTenant(db, tenantId),
        getTenantTemplateMap(db, tenantId),
      ]);

      if (!credentials) {
        // Critical error for auditing
        console.error(`[AppointmentCreation] Missing WhatsApp credentials for tenant ${tenantId}. Message NOT sent.`);
        throw new Error("WhatsApp integration missing for tenant");
      }

      // REAL LOGIC: Use configured template or default to system name
      const templateKey = TEMPLATE_NAMES.appointmentCreated;
      const templateToSend = templateMap?.get(templateKey)?.metaTemplateName ?? templateKey;
      
      const providerName = resolvedProvider?.full_name ?? "el especialista";
      const dateStr = startAt.toLocaleDateString("es-AR", { day: 'numeric', month: 'long', timeZone: locationTimezone });
      const timeStr = startAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: locationTimezone });

      // Based on real template structure:
      // {{1}} Patient
      // {{2}} Date (Body)
      // {{3}} Date (Label: Fecha)
      // {{4}} Time (Label: Hora)
      // {{5}} Location + Provider (Label: Dónde)
      const variablesToSend = [
          patient,
          dateStr,
          dateStr,
          timeStr,
          `${locationName ?? "nuestro consultorio"} con ${providerName}`,
      ];

      console.log(`[AppointmentCreation] Sending WhatsApp to ${normalizedPhone} (Template: ${templateToSend})`);

      await sendTemplateMessage({
        to: normalizedPhone,
        template: templateToSend,
        variables: variablesToSend,
        credentials,
        languageCode: "es"
      });

      await db.from("agenda_message_log").insert({
        tenant_id: tenantId,
        patient_id: patientId,
        appointment_id: (appt as AppointmentRow).id,
        direction: "out",
        type: TEMPLATE_NAMES.appointmentCreated,
        status: "sent",
        // @ts-ignore - The type definition in DB types might not include payload_json yet if not generated
        // but we want to save it as JSONB
        payload_json: {
            template: templateToSend,
            variables: variablesToSend,
            type: "template"
        }
      });

      logInfo("appointment.created_notification_sent", {
        tenant_id: tenantId,
        appointment_id: (appt as AppointmentRow).id,
        patient_id: patientId,
      });
    } catch (err) {
      logError("appointment.created_notification_failed", {
        tenant_id: tenantId,
        appointment_id: (appt as AppointmentRow).id,
        error: (err as Error)?.message ?? String(err),
      });
    }
  }

  return { appointment: appt };
}
