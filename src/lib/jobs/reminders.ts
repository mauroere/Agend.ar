import { addHours, differenceInMinutes } from "date-fns";
import { serviceClient } from "@/lib/supabase/service";
import { sendTemplateMessage } from "@/lib/whatsapp";
import { TEMPLATE_NAMES } from "@/lib/messages";
import { getWhatsAppIntegrationByTenant, getTenantTemplateMap } from "@/server/whatsapp-config";
import { logError, logInfo } from "@/lib/logging";
import { Database } from "@/types/database";

type ReminderAppointment = Database["public"]["Tables"]["agenda_appointments"]["Row"] & {
  agenda_patients: Pick<
    Database["public"]["Tables"]["agenda_patients"]["Row"],
    "id" | "full_name" | "phone_e164" | "opt_out"
  > | null;
};

export async function runReminderJob({ hoursAhead }: { hoursAhead: 24 | 2 }) {
  if (!serviceClient) throw new Error("Supabase service client unavailable");
  const now = new Date();
  const windowStart = addHours(now, hoursAhead - 0.25);
  const windowEnd = addHours(now, hoursAhead + 0.25);

  const { data: appointments, error } = await serviceClient
    .from("agenda_appointments")
    .select("id, tenant_id, patient_id, start_at, status, agenda_patients:patient_id(full_name, phone_e164, opt_out)")
    .eq("status", "confirmed")
    .gte("start_at", windowStart.toISOString())
    .lte("start_at", windowEnd.toISOString())
    .returns<ReminderAppointment[]>();

  if (error) throw error;
  logInfo("reminder.fetched", { job: "reminder", payload: { hoursAhead, count: appointments?.length ?? 0 } });

  const credentialCache = new Map<string, Awaited<ReturnType<typeof getWhatsAppIntegrationByTenant>>>();
  const templateCache = new Map<string, Awaited<ReturnType<typeof getTenantTemplateMap>>>();

  for (const appt of appointments ?? []) {
    const patient = appt.agenda_patients;
    if (!patient || patient.opt_out) continue;

    const minutesLeft = differenceInMinutes(new Date(appt.start_at), now);
    if (minutesLeft < (hoursAhead * 60 - 20) || minutesLeft > (hoursAhead * 60 + 20)) {
      continue;
    }

    // Idempotency check
    const { data: existingLog } = await serviceClient
      .from("agenda_message_log")
      .select("id")
      .eq("appointment_id", appt.id)
      .eq("type", hoursAhead === 24 ? TEMPLATE_NAMES.reminder24h : TEMPLATE_NAMES.reminder2h)
      .maybeSingle();

    if (existingLog) {
      continue;
    }

    const templateKey = hoursAhead === 24 ? TEMPLATE_NAMES.reminder24h : TEMPLATE_NAMES.reminder2h;
    const [credentials, templates] = await Promise.all([
      (async () => {
        if (!credentialCache.has(appt.tenant_id)) {
          credentialCache.set(appt.tenant_id, await getWhatsAppIntegrationByTenant(serviceClient, appt.tenant_id));
        }
        return credentialCache.get(appt.tenant_id) ?? null;
      })(),
      (async () => {
        if (!templateCache.has(appt.tenant_id)) {
          templateCache.set(appt.tenant_id, await getTenantTemplateMap(serviceClient, appt.tenant_id));
        }
        return templateCache.get(appt.tenant_id);
      })(),
    ]);

    if (!credentials) {
      logError("reminder.missing_credentials", {
        job: "reminder",
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
      });
      continue;
    }

    const templateOverride = templates?.get(templateKey)?.metaTemplateName ?? null;

    try {
      await sendTemplateMessage({
        to: patient.phone_e164,
        template: templateKey,
        variables: [patient.full_name, new Date(appt.start_at).toLocaleString("es-AR")],
        nameOverride: templateOverride,
        credentials,
      });

      await serviceClient
        .from("agenda_message_log")
        .insert({
          tenant_id: appt.tenant_id,
          patient_id: appt.patient_id,
          appointment_id: appt.id,
          direction: "out",
          type: templateKey,
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
