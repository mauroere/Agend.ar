import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { createAppointmentForTenant, AppointmentCreationError } from "@/server/appointments/createAppointment";

// POST /api/bot/appointments
// Body: { tenantId, patientPhone, patientName, date, time, serviceId, notes?, providerId? }
export async function POST(request: NextRequest) {
  try {
    if (!serviceClient) {
      console.error("Supabase service client not configured");
      return NextResponse.json({ error: "Configuration error" }, { status: 503 }); 
    }

    const body = await request.json();
    const { 
        tenantId, 
        patientPhone, 
        patientName, 
        date, 
        time, // "HH:MM" e.g. "09:00"
        serviceId,
        notes,
        providerId
    } = body;

    if (!tenantId || !patientPhone || !patientName || !date || !time) {
        return NextResponse.json({ error: "Missing required fields (tenantId, patientPhone, patientName, date, time)" }, { status: 400 });
    }

    // Construct ISO string for start time
    // We assume the date/time received from the bot corresponds to the tenant's timezone logic 
    // or is a plain ISO component string "YYYY-MM-DDTHH:MM:00".
    // createAppointmentForTenant expects an ISO string but handles Date conversion.
    const startIso = `${date}T${time}:00`;

    const { appointment } = await createAppointmentForTenant({
        db: serviceClient,
        tenantId,
        sendNotifications: true, // Send WhatsApp confirmation
        input: {
            patient: patientName,
            phone: patientPhone,
            start: startIso,
            serviceId: serviceId || null,
            providerId: providerId || null,
            notes: `Reserva vía Bot: ${notes || ""}`,
            // Optional: locationId (if omitted, logic picks provider default or first available)
        }
    });

    return NextResponse.json({ 
        success: true, 
        appointmentId: appointment.id,
        message: `Turno confirmado para el ${date} a las ${time}`
    });

  } catch (err: any) {
    if (err instanceof AppointmentCreationError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Bot Appointment Error", err);
    return NextResponse.json({ error: "Error interno al procesar la reserva" }, { status: 500 });
  }
}
