import { addHours, differenceInMinutes } from "date-fns";
import { serviceClient } from "@/lib/supabase/service";
import { sendTemplateMessage } from "@/lib/whatsapp";
import { TEMPLATE_NAMES } from "@/lib/messages";
import { logError, logInfo } from "@/lib/logging";
import { Database } from "@/types/database";

type ReminderAppointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  patients: Pick<
    Database["public"]["Tables"]["patients"]["Row"],
    "id" | "full_name" | "phone_e164" | "opt_out"
  > | null;
};

export async function runReminderJob({ hoursAhead }: { hoursAhead: 24 | 2 }) {
  if (!serviceClient) throw new Error("Supabase service client unavailable");
  const now = new Date();
  const windowStart = addHours(now, hoursAhead - 0.25);
  const windowEnd = addHours(now, hoursAhead + 0.25);

  const { data: appointments, error } = await serviceClient
    .from("appointments")
    .select("id, tenant_id, patient_id, start_at, status, patients:patient_id(full_name, phone_e164, opt_out)")
    .eq("status", "confirmed")
    .gte("start_at", windowStart.toISOString())
    .lte("start_at", windowEnd.toISOString())
    .returns<ReminderAppointment[]>();

  if (error) throw error;
  logInfo("reminder.fetched", { job: "reminder", payload: { hoursAhead, count: appointments?.length ?? 0 } });

  for (const appt of appointments ?? []) {
    const patient = appt.patients;
    if (!patient || patient.opt_out) continue;

    const minutesLeft = differenceInMinutes(new Date(appt.start_at), now);
    if (minutesLeft < (hoursAhead * 60 - 20) || minutesLeft > (hoursAhead * 60 + 20)) {
      continue;
    }

    try {
      await sendTemplateMessage({
        to: patient.phone_e164,
        template: hoursAhead === 24 ? TEMPLATE_NAMES.reminder24h : TEMPLATE_NAMES.reminder2h,
        variables: [patient.full_name, new Date(appt.start_at).toLocaleString("es-AR")],
      });

      await serviceClient
        .from("message_log")
        .insert({
          tenant_id: appt.tenant_id,
          patient_id: appt.patient_id,
          appointment_id: appt.id,
          direction: "out",
          type: hoursAhead === 24 ? TEMPLATE_NAMES.reminder24h : TEMPLATE_NAMES.reminder2h,
          status: "sent",
          payload_json: { hoursAhead },
        });

      logInfo("reminder.sent", {
        job: "reminder",
        tenant_id: appt.tenant_id,
        patient_id: appt.patient_id,
        appointment_id: appt.id,
        payload: { hoursAhead },
      });
    } catch (err) {
      logError("reminder.failed", {
        job: "reminder",
        tenant_id: appt.tenant_id,
        patient_id: appt.patient_id,
        appointment_id: appt.id,
        error: (err as Error)?.message ?? String(err),
      });
    }
  }
}
