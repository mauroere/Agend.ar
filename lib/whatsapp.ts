import { z } from "zod";

const baseUrl = "https://graph.facebook.com/v18.0";

const templateSchema = z.object({
  name: z.string(),
  language: z.object({ code: z.string() }),
  components: z.array(z.any()).optional(),
});

async function callWhatsAppAPI(path: string, init: RequestInit) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    throw new Error("WhatsApp credentials missing");
  }

  const res = await fetch(`${baseUrl}/${phoneId}/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`WhatsApp API error: ${res.status} ${error}`);
  }

  return res.json();
}

export async function sendTemplateMessage({
  to,
  template,
  variables = [],
}: {
  to: string;
  template: string;
  variables?: string[];
}) {
  const parsedTemplate = templateSchema.parse({
    name: template,
    language: { code: "es" },
  });

  return callWhatsAppAPI("messages", {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        ...parsedTemplate,
        components: [
          {
            type: "body",
            parameters: variables.map((value) => ({ type: "text", text: value })),
          },
        ],
      },
    }),
  });
}

export async function sendTextMessage({ to, text }: { to: string; text: string }) {
  return callWhatsAppAPI("messages", {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}
