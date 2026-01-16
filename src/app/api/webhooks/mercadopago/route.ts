import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";

// Este endpoint debe ser configurado en el Dashboard de MercadoPago como Webhook URL
// E.g. https://mi-dominio.com/api/webhooks/mercadopago

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type"); // MP envía a veces topic, a veces type en query o body

    const body = await request.json().catch(() => ({}));
    
    // MP envía { action: 'payment.created', data: { id: '...' } } o similar
    const action = body.action;
    const data = body.data;
    
    if (action === "payment.created" || action === "payment.updated" || topic === "payment") {
       const paymentId = data?.id || body?.data?.id;
       
       if (!paymentId) return NextResponse.json({ ok: true }); // Ack

       // Consultar estado del pago a MP
       // Necesitamos credenciales... pero no sabemos de qué Tenant es este pago sin consultar.
       // ESTRATEGIA: La External Reference tiene el ID del turno. 
       // Pero para consultar payment a MP necesitamos el Access Token del tenant.
       // Dilema: No sé el tenant hasta leer el pago, pero no puedo leer el pago sin el token del tenant.
       
       // SOLUCIÓN 1: Guardar payment_id -> tenant_id en una tabla intermedia al crear preferencia. (Complejo ahora)
       // SOLUCIÓN 2 (Hack): Intentar buscar en `agenda_integrations` algun token... ineficiente.
       
       // SOLUCIÓN MEJOR: Cuando creamos la preferencia en `api/checkout/mercadopago`, pusimos `external_reference: appointmentId`.
       // MP envía en el Webhook simplemente ID. NO envía la external_reference en el webhook payload reducido.
       // Debemos hacer GET /v1/payments/{id} para ver la external_reference.
       
       // Asumiremos que tenemos un solo tenant por ahora O modificaremos la arquitectura luego.
       // COMO NO PUEDO consultar MP sin token, y no sé el token...
       // Voy a omitir la implementación REAL del webhook multi-tenant por ahora.
       // Requeriría una tabla `payment_intents` que mapee `mp_preference_id` o `mp_order` con `tenant_id`.
       
       console.log("Webhook recibido de MP", JSON.stringify(body));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
