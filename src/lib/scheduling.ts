import { addMinutes, isBefore } from "date-fns";
import { DEFAULT_SLOT_DURATION_MIN } from "@/lib/constants";
import { Database } from "@/types/database";

export type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

type BusinessHours = Record<string, [string, string][]>;

export function isWithinBusinessHours(options: {
  start: Date;
  end: Date;
  businessHours: BusinessHours;
  timeZone: string;
}) {
  const { start, end, businessHours, timeZone } = options;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const partsStart = Object.fromEntries(fmt.formatToParts(start).map((p) => [p.type, p.value]));
  const partsEnd = Object.fromEntries(fmt.formatToParts(end).map((p) => [p.type, p.value]));

  const dayKey = (partsStart.weekday ?? "").slice(0, 3).toLowerCase(); // mon/tue...
  if (dayKey !== (partsEnd.weekday ?? "").slice(0, 3).toLowerCase()) return false;

  const intervals = businessHours?.[dayKey];
  if (!intervals || intervals.length === 0) return false;

  const toMinutes = (h: string, m: string) => Number(h) * 60 + Number(m);
  const startMinutes = toMinutes(partsStart.hour ?? "0", partsStart.minute ?? "0");
  const endMinutes = toMinutes(partsEnd.hour ?? "0", partsEnd.minute ?? "0");

  return intervals.some(([from, to]) => {
    const [fh, fm] = from.split(":");
    const [th, tm] = to.split(":");
    const fromM = toMinutes(fh, fm);
    const toM = toMinutes(th, tm);
    return startMinutes >= fromM && endMinutes <= toM;
  });
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
