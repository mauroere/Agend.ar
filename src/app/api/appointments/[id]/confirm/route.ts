import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";
import { sendTemplateMessage } from "@/lib/whatsapp";
import { TEMPLATE_NAMES } from "@/lib/messages";
import { getTenantTemplateMap, getWhatsAppIntegrationByTenant } from "@/server/whatsapp-config";
import { Database } from "@/types/database";

type AppointmentRow = Database["public"]["Tables"]["agenda_appointments"]["Row"] & {
    agenda_patients: Pick<Database["public"]["Tables"]["agenda_patients"]["Row"], "full_name" | "phone_e164"> | null;
    agenda_locations: Pick<Database["public"]["Tables"]["agenda_locations"]["Row"], "name" | "timezone"> | null;
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const appointmentId = params.id;
  if (!appointmentId) return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });

  // 1. Get current appointment details
  const { data: appointment, error: fetchError } = await db
    .from("agenda_appointments")
    .select("id, start_at, patient_id, agenda_patients(full_name, phone_e164), agenda_locations(name, timezone)")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .single<AppointmentRow>();

  if (fetchError || !appointment) {
     return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  // 2. Determine Logic: 
  // If we confirm, we update status.
  const { error } = await db
    .from("agenda_appointments")
    .update({ status: "confirmed" })
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 3. Send Notification (Best Effort)
  // We don't fail the request if notification fails, but we log it.
  try {
      const [credentials, templateMap] = await Promise.all([
        getWhatsAppIntegrationByTenant(db, tenantId),
        getTenantTemplateMap(db, tenantId),
      ]);

      if (credentials && appointment.agenda_patients?.phone_e164) {
          const templateKey = TEMPLATE_NAMES.appointmentConfirmed;
          const templateName = templateMap?.get(templateKey)?.metaTemplateName ?? templateKey;
          
          const startAt = new Date(appointment.start_at);
          const timeZone = appointment.agenda_locations?.timezone ?? "America/Argentina/Buenos_Aires";

          await sendTemplateMessage({
            to: appointment.agenda_patients.phone_e164,
            template: templateName,
            credentials,
            variables: [
                appointment.agenda_patients.full_name, // {{1}} Name
                startAt.toLocaleDateString("es-AR", { day: 'numeric', month: 'long', timeZone }), // {{2}} Date
                startAt.toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit', timeZone }), // {{3}} Time
            ]
          });

          // Log Success
          await db.from("agenda_message_log").insert({
              tenant_id: tenantId,
              patient_id: appointment.patient_id,
              appointment_id: appointmentId,
              direction: "out",
              type: templateKey,
              status: "sent",
              payload_json: { template: templateName }
          });
      }
  } catch (e) {
      console.error("Error sending confirmation whatsapp:", e);
      // Swallow error to not meaningfuly impact UI
  }

  return NextResponse.json({ ok: true });
}
