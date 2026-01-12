import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { sendTextMessage } from "@/lib/whatsapp";
import { Json } from "@/types/database";
import type { WhatsAppCredentials } from "@/server/whatsapp-config";
import { getTenantHeaderInfo } from "@/server/tenant-headers";
import {
  getWhatsAppIntegrationByPhoneId,
  getWhatsAppIntegrationByTenant,
  getWhatsAppIntegrationByVerifyToken,
} from "@/server/whatsapp-config";

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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    if (serviceClient) {
      const integration = await getWhatsAppIntegrationByVerifyToken(serviceClient, token);
      if (integration) {
        return new NextResponse(challenge, { status: 200 });
      }
    }

    if (token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return new NextResponse("forbidden", { status: 403 });
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

export async function POST(request: NextRequest) {
  const client = serviceClient;
  if (!client) {
    console.error("Supabase service client unavailable for WhatsApp webhook");
    return NextResponse.json({ error: "service_unavailable" }, { status: 500 });
  }

  const payload = await request.json();
  const entries = payload.entry ?? [];
  const headerInfo = getTenantHeaderInfo(request.headers as Headers);
  const tenantFromHeader = headerInfo.internalId ?? undefined;
  
  const tenantCredentialCache = new Map<string, Awaited<ReturnType<typeof getWhatsAppIntegrationByTenant>>>();
  const phoneLookupCache = new Map<string, Awaited<ReturnType<typeof getWhatsAppIntegrationByPhoneId>>>();

  const resolveTenant = async (metadata: Record<string, any> | undefined) => {
    // 1. Try resolving via Header (if routed internally) or Metadata
    const candidateTenant = tenantFromHeader ?? metadata?.tenant_id;
    
    if (candidateTenant) {
      if (!tenantCredentialCache.has(candidateTenant)) {
        tenantCredentialCache.set(candidateTenant, await getWhatsAppIntegrationByTenant(client, candidateTenant));
      }
      return {
        tenantId: candidateTenant,
        credentials: tenantCredentialCache.get(candidateTenant) ?? null,
      };
    }

    // 2. Try resolving via Phone Number ID
    const phoneNumberId = metadata?.phone_number_id;
    if (phoneNumberId) {
      if (!phoneLookupCache.has(phoneNumberId)) {
        phoneLookupCache.set(phoneNumberId, await getWhatsAppIntegrationByPhoneId(client, phoneNumberId));
      }
      const match = phoneLookupCache.get(phoneNumberId);
      if (match) {
        if(!tenantCredentialCache.has(match.tenantId)) {
             tenantCredentialCache.set(match.tenantId, match.credentials); 
        }
        return match;
      }
    }

    return null;
  };

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      // --- HANDLE STATUS UPDATES ---
      if (value.statuses) {
        for (const status of value.statuses) {
          await updateMessageStatus(status);
        }
      }

      // --- HANDLE INCOMING MESSAGES ---
      if (value.messages) {
        const resolution = await resolveTenant(value.metadata);
        
        if (!resolution) {
          console.log("Could not resolve tenant for incoming message", JSON.stringify(value.metadata));
          continue;
        }

        const { tenantId, credentials } = resolution;
        
        for (const message of value.messages) {
          const from = normalizePhone(message.from);
          
          const { data: patient } = await client
            .from("agenda_patients")
            .select("id, tenant_id, opt_out")
            .eq("phone_e164", from)
            .eq("tenant_id", tenantId)
            .single();

          if (!patient) {
              console.log(`Unknown patient number ${from} for tenant ${tenantId}`);
              continue;
          }

          await logMessage({
            tenantId,
            patientId: patient.id,
            direction: "in",
            type: message.type ?? null,
            status: "received",
            waMessageId: message.id,
            payload: message as Json,
          });

          // Extract content
          let bodyText = "";
          
          if (message.type === "text") {
            bodyText = message.text?.body ?? "";
          } else if (message.type === "interactive") {
            if (message.interactive?.type === "button_reply") {
                bodyText = message.interactive.button_reply?.title ?? ""; // Use title (e.g. "Confirmar") to match logic
            } else if (message.interactive?.type === "list_reply") {
                bodyText = message.interactive.list_reply?.title ?? "";
            }
          } else if (message.type === "button") {
             bodyText = message.button?.text ?? "";
          }

          if (bodyText) {
            await handleReply({
              tenantId,
              patientId: patient.id,
              phone: from,
              text: bodyText,
              credentials,
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
