import { NextRequest, NextResponse } from "next/server";
import { 
    getWhatsAppIntegrationByPhoneId, 
    getWhatsAppIntegrationByVerifyToken 
} from "@/server/whatsapp-config";
import { processBotMessage } from "@/lib/bot/engine";
import { serviceClient } from "@/lib/supabase/service";


function normalizePhone(phone: string) {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

async function logMessage({
  tenantId,
  patientId,
  direction,
  type,
  status,
  waMessageId,
  payload,
}: {
  tenantId: string;
  patientId: string;
  direction: "in" | "out";
  type: string | null;
  status: string;
  waMessageId?: string | null;
  payload: Json;
}) {
  if (!serviceClient) return;

  await serviceClient.from("agenda_message_log").insert({
    tenant_id: tenantId,
    patient_id: patientId,
    direction,
    type,
    status,
    wa_message_id: waMessageId ?? null,
    payload_json: payload,
  });
}

async function handleReply({
  tenantId,
  patientId,
  phone,
  text,
  credentials,
}: {
  tenantId: string;
  patientId: string;
  phone: string;
  text: string;
  credentials: WhatsAppCredentials | null;
}) {
  if (!serviceClient) return;

  const normalized = text.trim().toUpperCase();
  const respond = async (message: string) => {
    if (!credentials) return;
    await sendTextMessage({ to: phone, text: message, credentials });
  };

  if (normalized === "STOP") {
    await serviceClient
      .from("agenda_patients")
      .update({ opt_out: true, opt_out_at: new Date().toISOString() })
      .eq("id", patientId)
      .eq("tenant_id", tenantId);
    await logMessage({
      tenantId,
      patientId,
      direction: "out",
      type: "opt_out_ack",
      status: "queued",
      payload: { text: "Opt-out" },
    });
    await respond("Listo, no te vamos a enviar más recordatorios. Escribí SI si querés reactivar.");
    return;
  }
  
  if (normalized === "SI" || normalized === "START") {
     await serviceClient
      .from("agenda_patients")
      .update({ opt_out: false, opt_out_at: null })
      .eq("id", patientId)
      .eq("tenant_id", tenantId);
     await respond("¡Gracias! Volveremos a enviarte recordatorios.");
     return;
  }

  // Handle number/keyword responses
  if (["1", "2", "3", "CONFIRMAR", "CANCELAR", "REPROGRAMAR"].includes(normalized)) {
    const upcoming = await serviceClient
      .from("agenda_appointments")
      .select("id, start_at, location_id")
      .eq("patient_id", patientId)
      .eq("tenant_id", tenantId)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(1);

    const appointment = upcoming.data?.[0];
    if (!appointment) return;

    if (normalized === "1" || normalized === "CONFIRMAR") {
      await serviceClient
        .from("agenda_appointments")
        .update({ status: "confirmed" })
        .eq("id", appointment.id)
        .eq("tenant_id", tenantId);
      await respond("¡Perfecto! Te esperamos.");
    }

    if (normalized === "3" || normalized === "CANCELAR") {
      await serviceClient
        .from("agenda_appointments")
        .update({ status: "canceled" })
        .eq("id", appointment.id)
        .eq("tenant_id", tenantId);
      await respond("Turno cancelado. Si querés otro horario respondé SI al mensaje de creación.");
    }

    if (normalized === "2" || normalized === "REPROGRAMAR") {
      await serviceClient
        .from("agenda_appointments")
        .update({ status: "reschedule_requested" })
        .eq("id", appointment.id)
        .eq("tenant_id", tenantId);
      await respond("Entendido. Nos pondremos en contacto para reprogramar.");
    }
  }
}

// Verification Endpoint (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token) {
     const integration = await getWhatsAppIntegrationByVerifyToken(serviceClient, token);
     if (integration) {
       return new NextResponse(challenge, { status: 200 });
     }
  }
  return new NextResponse("Forbidden", { status: 403 });
}

async function updateMessageStatus(statusObj: any) {
  if (!serviceClient) return;

  const waId = statusObj.id;
  const newStatus = statusObj.status;
  
  if (waId && newStatus) {
    await serviceClient
      .from("agenda_message_log")
      .update({ status: newStatus })
      .eq("wa_message_id", waId);
  }
}

// Message Handler (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value) return NextResponse.json({ status: "ignored" });

    // Identify Tenant by Phone ID Receiver
    const phoneNumberId = value.metadata?.phone_number_id;
    if (!phoneNumberId) return NextResponse.json({ status: "ignored" });

    const integration = await getWhatsAppIntegrationByPhoneId(serviceClient, phoneNumberId);
    if (!integration) {
        console.warn(`[Webhook] No tenant found for PhoneID ${phoneNumberId}`);
        return NextResponse.json({ status: "ignored" }); // Don't error, just ignore
    }

    const message = value.messages?.[0];
    if (message) {
       // Only handle text messages for now
       if (message.type === "text") {
           const from = message.from; // e.g. "54911..."
           const text = message.text.body;
           const userName = value.contacts?.[0]?.profile?.name || "Usuario";
           
           await processBotMessage(
               integration.tenant_id, 
               "+" + from, // Ensure E.164
               text, 
               userName, 
               integration.credentials_parsed
           );
       }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Webhook Error]", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
