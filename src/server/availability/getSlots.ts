import { addMinutes, format, isAfter, isBefore, startOfDay } from "date-fns";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { isWithinBusinessHours } from "@/lib/scheduling";

type AppointmentRow = Database["public"]["Tables"]["agenda_appointments"]["Row"];
type LocationRow = Database["public"]["Tables"]["agenda_locations"]["Row"];

type AppointmentSlice = Pick<AppointmentRow, "start_at" | "end_at" | "provider_id" | "location_id">;
type LocationSettings = Pick<LocationRow, "business_hours" | "timezone" | "buffer_minutes">;

export class AvailabilityError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type AnySupabaseClient = SupabaseClient<Database, "public", any>;

export async function getAvailabilitySlots(options: {
  db: AnySupabaseClient;
  tenantId: string;
  date: string;
  locationId: string;
  durationMinutes: number;
  providerId?: string | null;
}) {
  const { db, tenantId, date, locationId, durationMinutes, providerId } = options;
  const normalizedDuration = Math.max(5, Number.isFinite(durationMinutes) ? durationMinutes : 30);

  if (!date || !locationId) {
    throw new AvailabilityError("Date and location required", 400);
  }

  const targetDate = new Date(date);
  if (!Number.isFinite(targetDate.getTime())) {
    throw new AvailabilityError("Invalid date", 400);
  }

  const { data: locationData, error: locationError } = await db
    .from("agenda_locations")
    .select("business_hours, timezone, buffer_minutes")
    .eq("tenant_id", tenantId)
    .eq("id", locationId)
    .maybeSingle();

  if (locationError) {
    throw new AvailabilityError(locationError.message, 400);
  }

  if (!locationData) {
    throw new AvailabilityError("Consultorio no encontrado", 404);
  }

  let businessHours = (locationData.business_hours as Record<string, [string, string][]>) ?? {};
  if (Object.keys(businessHours).length === 0) {
    businessHours = {
      mon: [["09:00", "18:00"]],
      tue: [["09:00", "18:00"]],
      wed: [["09:00", "18:00"]],
      thu: [["09:00", "18:00"]],
      fri: [["09:00", "18:00"]],
    } as Record<string, [string, string][]>;
  }

  const timeZone = locationData.timezone ?? "America/Argentina/Buenos_Aires";
  const buffer = locationData.buffer_minutes ?? 0;

  const startDay = startOfDay(targetDate);
  const endDay = addMinutes(startDay, 24 * 60);

  const { data: appointments, error: appointmentsError } = await db
    .from("agenda_appointments")
    .select("start_at, end_at, provider_id, location_id")
    .eq("tenant_id", tenantId)
    .neq("status", "canceled")
    .gte("end_at", startDay.toISOString())
    .lte("start_at", endDay.toISOString());

  if (appointmentsError) {
    throw new AvailabilityError(appointmentsError.message, 400);
  }

  const blockingAppointments = (appointments ?? []).filter((appt) => {
    if (providerId) {
      if (appt.provider_id === providerId) return true;
      if (!appt.provider_id && appt.location_id === locationId) return true;
      return false;
    }

    return appt.location_id === locationId;
  });

  const interval = 30;
  const slots: string[] = [];
  let current = startDay;
  const today = startOfDay(new Date());
  const isSameDay = today.getTime() === startDay.getTime();

  while (isBefore(current, endDay)) {
    const slotEnd = addMinutes(current, normalizedDuration);

    const isOpen = isWithinBusinessHours({
      start: current,
      end: slotEnd,
      businessHours,
      timeZone,
    });

    if (isOpen) {
      const hasConflict = blockingAppointments.some((appt) => {
        const apptStart = new Date(appt.start_at);
        const apptEnd = new Date(appt.end_at);

        const bufferedStart = addMinutes(apptStart, -buffer);
        const bufferedEnd = addMinutes(apptEnd, buffer);

        return current < bufferedEnd && slotEnd > bufferedStart;
      });

      if (!hasConflict) {
        if (!isSameDay || isAfter(current, new Date())) {
          slots.push(format(current, "HH:mm"));
        }
      }
    }

    current = addMinutes(current, interval);
  }

  return slots;
}
