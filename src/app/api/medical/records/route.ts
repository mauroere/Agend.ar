import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";
import { z } from "zod";

const recordSchema = z.object({
  appointmentId: z.string().uuid(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional()
});

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId, session } = context;

  const json = await request.json();
  const parsed = recordSchema.safeParse(json);
  
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { appointmentId, diagnosis, treatment, notes, attachments } = parsed.data;

  // 1. Get Appointment details to link Patient and Provider
  const { data: appt } = await db.from("agenda_appointments")
     .select("id, patient_id, provider_id")
     .eq("id", appointmentId)
     .eq("tenant_id", tenantId)
     .single();
  
  if (!appt) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

  // 2. Create Record
  const { data: record, error: recError } = await db
    .from("agenda_medical_records")
    .insert({
      tenant_id: tenantId,
      appointment_id: appointmentId,
      patient_id: appt.patient_id!,
      provider_id: appt.provider_id, // If null, means generic staff, but schema allows null
      diagnosis,
      treatment,
      notes,
    })
    .select()
    .single();

  if (recError) {
    console.error("[MedicalRecord] Insert Error:", recError);
    return NextResponse.json({ error: recError.message, details: recError }, { status: 500 });
  }

  // 3. Save Attachments
  if (attachments && attachments.length > 0) {
    const { error: attachError } = await db.from("agenda_medical_attachments").insert(
      attachments.map((url: string) => ({
        record_id: (record as any).id,
        file_url: url,
        file_type: "image/jpeg", // Simplified for now
      }))
    );

    if (attachError) {
      console.error("[MedicalRecord] Attachment Error:", attachError);
      // We don't rollback record creation here (simple implementation) but we should report
    }
  }

  // 4. Update Appointment Status to COMPLETED
  await db.from("agenda_appointments")
     .update({ status: "completed" }) 
     .eq("id", appointmentId);

  return NextResponse.json({ success: true, recordId: (record as any).id });
}
