import { addHours } from "date-fns";
import { serviceClient } from "@/lib/supabase/service";
import { sendTemplateMessage } from "@/lib/whatsapp";
import { TEMPLATE_NAMES } from "@/lib/messages";
import { getWhatsAppIntegrationByTenant, getTenantTemplateMap } from "@/server/whatsapp-config";
import { logError, logInfo } from "@/lib/logging";

export async function runWaitlistJob() {
  if (!serviceClient) throw new Error("Supabase service client unavailable");

  const cutoff = addHours(new Date(), 48).toISOString();
  // Fetch canceled appointments, including location details for timezone
  const { data: canceled } = await serviceClient
    .from("agenda_appointments")
    .select("id, tenant_id, location_id, start_at, agenda_locations:location_id(name, timezone)")
    .eq("status", "canceled")
    .gte("updated_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .lte("start_at", cutoff);

  logInfo("waitlist.canceled_found", { job: "waitlist", payload: { count: canceled?.length ?? 0 } });

  const credentialCache = new Map<string, Awaited<ReturnType<typeof getWhatsAppIntegrationByTenant>>>();
  const templateCache = new Map<string, Awaited<ReturnType<typeof getTenantTemplateMap>>>();
  const templateKey = TEMPLATE_NAMES.waitlistOffer;

  // Cast canceled to any[] or specific type to avoid "never" inference
  const safeCanceled = (canceled ?? []) as any[];

  for (const appt of safeCanceled) {
    const timeZone = appt.agenda_locations?.timezone ?? "America/Argentina/Buenos_Aires";
    const _locationName = appt.agenda_locations?.name ?? "";

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
      logError("waitlist.missing_credentials", {
        job: "waitlist",
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
      });
      continue;
    }

    const templateOverride = templates?.get(templateKey)?.metaTemplateName ?? null;

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

      // Idempotency check
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
      
      const apptDate = new Date(appt.start_at);

      try {
        await sendTemplateMessage({
          to: patient.phone_e164,
          template: templateKey,
          variables: [
            apptDate.toLocaleDateString("es-AR", { day: 'numeric', month: 'long', timeZone }),
            apptDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone }),
          ],
          nameOverride: templateOverride,
          credentials,
        });

        await serviceClient.from("agenda_message_log").insert({
          tenant_id: appt.tenant_id,
          patient_id: patient.id,
          appointment_id: appt.id,
          direction: "out",
          type: templateKey,
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
