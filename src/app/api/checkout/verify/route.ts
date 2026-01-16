import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { paymentId, appointmentId } = body;

  if (!paymentId || !appointmentId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  // 1. Obtener Appointment para saber el Tenant
  const { data: appointment, error: appError } = await serviceClient!
    .from("agenda_appointments")
    .select("tenant_id, status")
    .eq("id", appointmentId)
    .single();

  if (appError || !appointment) {
     return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  // Si ya está confirmado, no hacer nada
  if (appointment.status === "confirmed") {
      return NextResponse.json({ ok: true, status: "confirmed" });
  }

  const tenantId = appointment.tenant_id;

  // 2. Obtener Credenciales del Tenant
  const { data: integration } = await serviceClient!
    .from("agenda_integrations")
    .select("credentials")
    .eq("tenant_id", tenantId)
    .eq("provider", "mercadopago")
    .eq("enabled", true)
    .single();

  const credentials = integration?.credentials as { access_token: string } | undefined;

  if (!credentials?.access_token) {
      return NextResponse.json({ error: "No hay credenciales de pago" }, { status: 400 });
  }

  // 3. Consultar a MercadoPago
  try {
     const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
            "Authorization": `Bearer ${credentials.access_token}`
        }
     });
     
     const paymentData = await mpRes.json();
     
     if (paymentData.status === "approved" || paymentData.status === "authorized") {
         // 4. Actualizar Turno
         await serviceClient!
            .from("agenda_appointments")
            .update({ status: "confirmed" }) // @ts-ignore status pending -> confirmed
            .eq("id", appointmentId);
            
         return NextResponse.json({ ok: true, status: "confirmed" });
     } else {
         return NextResponse.json({ ok: true, status: "pending_payment_approval", detail: paymentData.status });
     }

  } catch (error) {
      console.error(error);
      return NextResponse.json({ error: "Error verificando pago" }, { status: 500 });
  }
}
