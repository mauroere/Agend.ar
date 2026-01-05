import { addHours } from "date-fns";
import { serviceClient } from "@/lib/supabase/service";
import { sendTemplateMessage } from "@/lib/whatsapp";
import { TEMPLATE_NAMES } from "@/lib/messages";

export async function runWaitlistJob() {
  if (!serviceClient) throw new Error("Supabase service client unavailable");

  const cutoff = addHours(new Date(), 48).toISOString();
  const { data: canceled } = await serviceClient
    .from("appointments")
    .select("id, tenant_id, location_id, start_at")
    .eq("status", "canceled")
    .gte("updated_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .lte("start_at", cutoff);

  for (const appt of canceled ?? []) {
    const { data: waiters } = await serviceClient
      .from("waitlist")
      .select("id, patient_id, priority, patients:patient_id(id, full_name, phone_e164, opt_out)")
      .eq("location_id", appt.location_id)
      .eq("tenant_id", appt.tenant_id)
      .eq("active", true)
      .order("priority", { ascending: true })
      .limit(10);

    for (const w of waiters ?? []) {
      const patient = (w as any).patients;
      if (!patient || patient.opt_out) continue;

      await sendTemplateMessage({
        to: patient.phone_e164,
        template: TEMPLATE_NAMES.waitlistOffer,
        variables: [
          new Date(appt.start_at).toLocaleDateString("es-AR"),
          new Date(appt.start_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        ],
      });

      await serviceClient.from("message_log").insert({
        tenant_id: appt.tenant_id,
        patient_id: patient.id,
        appointment_id: appt.id,
        direction: "out",
        type: TEMPLATE_NAMES.waitlistOffer,
        status: "sent",
      });
    }
  }
}
