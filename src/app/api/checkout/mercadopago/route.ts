import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/service";

const bodySchema = z.object({
  tenantId: z.string().uuid(),
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  priceAmount: z.number().positive(), // En pesos (ej: 1500)
  patientName: z.string(),
  patientEmail: z.string().email().optional(),
  appointmentId: z.string().uuid().optional(), // Si ya creamos el turno como pending
});

export async function POST(request: NextRequest) {
  // 1. Parsear Body primero para obtener tenantId
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const { tenantId, serviceName, priceAmount, patientName, patientEmail, appointmentId } = parsed.data;

  if (!serviceClient) {
      return NextResponse.json({ error: "Service client error" }, { status: 500 });
  }

  // 2. Obtener credenciales de MercadoPago
  const { data: integration, error: intError } = await serviceClient
    .from("agenda_integrations")
    .select("credentials")
    .eq("tenant_id", tenantId)
    .eq("provider", "mercadopago")
    .eq("enabled", true)
    .single();

  if (intError || !integration) {
    return NextResponse.json({ error: "MercadoPago no está configurado en este negocio." }, { status: 400 });
  }

  const credentials = integration.credentials as { access_token: string; public_key: string };
  if (!credentials?.access_token) {
    return NextResponse.json({ error: "Credenciales de MercadoPago inválidas." }, { status: 400 });
  }

  // 3. Crear Preferencia en MercadoPago (usando fetch para no depender de la librería si falló install)
  try {
    // 2. Parsear body - Already done
    // const json = await request.json().catch(() => ({})); 
    // const parsed = bodySchema.safeParse(json);
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${credentials.access_token}`
      },
      body: JSON.stringify({
        items: [
          {
            title: serviceName,
            quantity: 1,
            currency_id: "ARS",
            unit_price: priceAmount
          }
        ],
        payer: {
          name: patientName,
          email: patientEmail || "test_user_123456@testuser.com" // Email dummy si no hay
        },
        back_urls: {
          success: `${request.nextUrl.origin}/checkout/success`,
          failure: `${request.nextUrl.origin}/checkout/failure`,
          pending: `${request.nextUrl.origin}/checkout/pending`
        },
        auto_return: "approved",
        external_reference: appointmentId || `tenant_${tenantId}_temp_${Date.now()}`,
        statement_descriptor: "AGENDAR CITA"
      })
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
        console.error("MP Error:", mpData);
        throw new Error(mpData.message || "Error al contactar con MercadoPago");
    }

    return NextResponse.json({
      preferenceId: mpData.id,
      initPoint: mpData.init_point, // Link para redirigir
      sandboxInitPoint: mpData.sandbox_init_point
    });

  } catch (error) {
    console.error("Error creando preferencia:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 });
  }
}
