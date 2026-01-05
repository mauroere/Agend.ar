import { addMinutes, isBefore } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE, DEFAULT_SLOT_DURATION_MIN } from "@/lib/constants";
import { Database } from "@/types/database";

export type AppointmentRow = Database["public"]["Tables"]["agenda_appointments"]["Row"];

export function toLocal(date: string | Date) {
  return toZonedTime(date, APP_TIMEZONE);
}

export function toUTC(date: Date) {
  return fromZonedTime(date, APP_TIMEZONE);
}

export function calculateAvailability({
  start,
  end,
  appointments,
  durationMinutes = DEFAULT_SLOT_DURATION_MIN,
  bufferMinutes = 0,
}: {
  start: Date;
  end: Date;
  appointments: AppointmentRow[];
  durationMinutes?: number;
  bufferMinutes?: number;
}) {
  const slots: { start: Date; end: Date }[] = [];
  let cursor = new Date(start);

  while (isBefore(addMinutes(cursor, durationMinutes), end)) {
    const candidateEnd = addMinutes(cursor, durationMinutes);
    const overlaps = appointments.some((appt) => {
      const apptStart = new Date(appt.start_at);
      const apptEnd = new Date(appt.end_at);
      return cursor < apptEnd && candidateEnd > apptStart;
    });

    if (!overlaps) {
      slots.push({ start: new Date(cursor), end: candidateEnd });
    }

    cursor = addMinutes(cursor, durationMinutes + bufferMinutes);
  }

  return slots;
}
