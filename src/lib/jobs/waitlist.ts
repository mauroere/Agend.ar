import { addHours } from "date-fns";
import { serviceClient } from "@/lib/supabase/service";
import { sendTemplateMessage } from "@/lib/whatsapp";
import { TEMPLATE_NAMES } from "@/lib/messages";
import { logError, logInfo } from "@/lib/logging";

export async function runWaitlistJob() {
  if (!serviceClient) throw new Error("Supabase service client unavailable");

  const cutoff = addHours(new Date(), 48).toISOString();
  const { data: canceled } = await serviceClient
    .from("agenda_appointments")
    .select("id, tenant_id, location_id, start_at")
    .eq("status", "canceled")
    .gte("updated_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .lte("start_at", cutoff);

  logInfo("waitlist.canceled_found", { job: "waitlist", payload: { count: canceled?.length ?? 0 } });

  for (const appt of canceled ?? []) {
    const { data: waiters } = await serviceClient
      .from("agenda_waitlist")
      .select("id, patient_id, priority, agenda_patients:patient_id(id, full_name, phone_e164, opt_out)")
      .eq("location_id", appt.location_id)
      .eq("tenant_id", appt.tenant_id)
      .eq("active", true)
      .order("priority", { ascending: true })
      .limit(10);

    for (const w of waiters ?? []) {
      const patient = (w as any).agenda_patients;
      if (!patient || patient.opt_out) continue;

      // Idempotency check: Don't send the same offer twice to the same patient for the same appointment
      const { data: existingLog } = await serviceClient
        .from("agenda_message_log")
        .select("id")
        .eq("appointment_id", appt.id)
        .eq("patient_id", patient.id)
        .eq("type", TEMPLATE_NAMES.waitlistOffer)
        .maybeSingle();

      if (existingLog) {
        continue;
      }

      try {
        await sendTemplateMessage({
          to: patient.phone_e164,
          template: TEMPLATE_NAMES.waitlistOffer,
          variables: [
            new Date(appt.start_at).toLocaleDateString("es-AR"),
            new Date(appt.start_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
          ],
        });

        await serviceClient.from("agenda_message_log").insert({
          tenant_id: appt.tenant_id,
          patient_id: patient.id,
          appointment_id: appt.id,
          direction: "out",
          type: TEMPLATE_NAMES.waitlistOffer,
          status: "sent",
        });

        logInfo("waitlist.sent", {
          job: "waitlist",
          tenant_id: appt.tenant_id,
          appointment_id: appt.id,
          patient_id: patient.id,
        });
      } catch (err) {
        logError("waitlist.failed", {
          job: "waitlist",
          tenant_id: appt.tenant_id,
          appointment_id: appt.id,
          patient_id: patient.id,
          error: (err as Error)?.message ?? String(err),
        });
      }
    }
  }
}
