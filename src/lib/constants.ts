export const APP_TIMEZONE = "America/Argentina/Buenos_Aires" as const;
export const DEFAULT_SLOT_DURATION_MIN = 30;
export const SLOT_LOOKAHEAD_DAYS = 7;
export const WAITLIST_LOOKAHEAD_HOURS = 48;

export const APPOINTMENT_STATUS = [
  "pending",
  "confirmed",
  "reschedule_requested",
  "canceled",
  "completed",
  "no_show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

export const CRON_SECRET_HEADER = "x-cron-secret";
