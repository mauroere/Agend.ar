import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  const appointmentId = params.id;

  // Verify ownership via email
  // We need to fetch the appointment -> patient -> email
  const { data: appointment, error: fetchError } = await serviceClient
    .from("agenda_appointments")
    .select("id, status, start_at, patient:agenda_patients(email)")
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Check if patient email matches logged in user email
  // @ts-ignore
  const patientEmail = appointment.patient?.email;

  if (patientEmail !== userEmail) {
      return NextResponse.json({ error: "Unauthorized access to this appointment" }, { status: 403 });
  }

  // Check timing (e.g. can't cancel if it already started? For now allow consistent with logic)
  if (appointment.status === 'canceled') {
    return NextResponse.json({ error: "Already canceled" }, { status: 400 });
  }

  // Perform Cancel
  const { error: updateError } = await serviceClient
    .from("agenda_appointments")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", appointmentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
