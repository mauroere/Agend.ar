import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { TEMPLATE_NAMES } from "@/lib/messages";
import { sendTemplateMessage, sendTextMessage } from "@/lib/whatsapp";
import { Json } from "@/types/database";

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

  await serviceClient.from("message_log").insert({
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
}: {
  tenantId: string;
  patientId: string;
  phone: string;
  text: string;
}) {
  if (!serviceClient) return;

  const normalized = text.trim().toUpperCase();

  if (normalized === "STOP") {
    await serviceClient
      .from("patients")
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
    await sendTextMessage({
      to: phone,
      text: "Listo, no te vamos a enviar más recordatorios. Escribí SI si querés reactivar.",
    });
    return;
  }

  if (["1", "2", "3"].includes(normalized)) {
    const upcoming = await serviceClient
      .from("appointments")
      .select("id, start_at, location_id")
      .eq("patient_id", patientId)
      .eq("tenant_id", tenantId)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(1);

    const appointment = upcoming.data?.[0];
    if (!appointment) return;

    if (normalized === "1") {
      await serviceClient
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", appointment.id)
        .eq("tenant_id", tenantId);
      await sendTextMessage({ to: phone, text: "¡Perfecto! Te esperamos." });
    }

    if (normalized === "3") {
      await serviceClient
        .from("appointments")
        .update({ status: "canceled" })
        .eq("id", appointment.id)
        .eq("tenant_id", tenantId);
      await sendTextMessage({
        to: phone,
        text: "Turno cancelado. Si querés otro horario respondé SI.",
      });
      // Waitlist job tomará esta cancelación.
    }

    if (normalized === "2") {
      await serviceClient
        .from("appointments")
        .update({ status: "reschedule_requested" })
        .eq("id", appointment.id)
        .eq("tenant_id", tenantId);
      const slots = ["09:00", "11:30", "15:00"];
      await sendTextMessage({
        to: phone,
        text: `Ofrecemos ${slots.join(", ")}. Respondé A/B/C para elegir o STOP para salir`,
      });
    }
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "OK", { status: 200 });
  }

  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const entries = payload.entry ?? [];
  const tenantFromHeader = request.headers.get("x-tenant-id") ?? undefined;

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      for (const message of messages) {
        const from = normalizePhone(message.from);
        const tenantId = tenantFromHeader ?? change.value?.metadata?.tenant_id ?? "tenant_1";

        if (!serviceClient) continue;
        const { data: patient } = await serviceClient
          .from("patients")
          .select("id, tenant_id, opt_out")
          .eq("phone_e164", from)
          .eq("tenant_id", tenantId)
          .single();

        if (!patient) continue;

        await logMessage({
          tenantId,
          patientId: patient.id,
          direction: "in",
          type: message.type ?? null,
          status: message.status ?? "received",
          waMessageId: message.id,
          payload: message as Json,
        });

        if (message.type === "text") {
          await handleReply({
            tenantId,
            patientId: patient.id,
            phone: from,
            text: message.text?.body ?? "",
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
