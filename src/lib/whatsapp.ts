import { z } from "zod";
import type { WhatsAppCredentials } from "@/server/whatsapp-config";

const baseUrl = "https://graph.facebook.com/v18.0";

const templateSchema = z.object({
  name: z.string(),
  language: z.object({ code: z.string() }),
  components: z.array(z.any()).optional(),
});

async function callWhatsAppAPI({
  credentials,
  path,
  init,
}: {
  credentials: WhatsAppCredentials;
  path: string;
  init: RequestInit;
}) {
  const { accessToken, phoneNumberId } = credentials;

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp credentials missing");
  }

  const res = await fetch(`${baseUrl}/${phoneNumberId}/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
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
  languageCode = "es",
  nameOverride,
  credentials,
}: {
  to: string;
  template: string;
  variables?: string[];
  languageCode?: string;
  nameOverride?: string | null;
  credentials: WhatsAppCredentials;
}) {
  const templateName = nameOverride ?? template;
  const parsedTemplate = templateSchema.parse({
    name: templateName,
    language: { code: languageCode },
  });

  return callWhatsAppAPI({
    credentials,
    path: "messages",
    init: {
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
    },
  });
}

export async function sendTextMessage({
  to,
  text,
  credentials,
}: {
  to: string;
  text: string;
  credentials: WhatsAppCredentials;
}) {
  return callWhatsAppAPI({
    credentials,
    path: "messages",
    init: {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    },
  });
}
