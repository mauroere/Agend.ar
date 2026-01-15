import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const PROVIDER = "meta_whatsapp";

type IntegrationRow = Database["public"]["Tables"]["agenda_integrations"]["Row"];
type TemplateRow = Database["public"]["Tables"]["agenda_message_templates"]["Row"];

export type WhatsAppCredentials = {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string | null;
  verifyToken?: string | null;
};

function parseCredentials(credentials: IntegrationRow["credentials"]): WhatsAppCredentials | null {
  if (!credentials || typeof credentials !== "object") return null;

  const maybeCreds = credentials as Record<string, unknown>;
  const phoneNumberId = typeof maybeCreds.phoneNumberId === "string" ? maybeCreds.phoneNumberId : undefined;
  const accessToken = typeof maybeCreds.accessToken === "string" ? maybeCreds.accessToken : undefined;
  const businessAccountId = typeof maybeCreds.businessAccountId === "string" ? maybeCreds.businessAccountId : null;
  const verifyToken = typeof maybeCreds.verifyToken === "string" ? maybeCreds.verifyToken : null;

  if (!phoneNumberId || !accessToken) {
    return null;
  }

  return {
    phoneNumberId,
    accessToken,
    businessAccountId,
    verifyToken,
  };
}

async function fetchIntegration(
  db: SupabaseClient<Database>,
  filters: Record<string, string>,
): Promise<(IntegrationRow & { credentials_parsed: WhatsAppCredentials }) | null> {
  let query = db
    .from("agenda_integrations")
    .select("id, tenant_id, provider, credentials, created_at, updated_at, enabled")
    .eq("provider", PROVIDER)
    .limit(1);

  for (const [path, value] of Object.entries(filters)) {
    query = query.filter(path, "eq", value);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  const parsed = parseCredentials(data.credentials);
  if (!parsed) return null;

  return { ...data, credentials_parsed: parsed };
}

export async function getWhatsAppIntegrationByTenant(
  db: SupabaseClient<Database>,
  tenantId: string,
): Promise<WhatsAppCredentials | null> {
  const record = await db
    .from("agenda_integrations")
    .select("tenant_id, provider, credentials, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .eq("provider", PROVIDER)
    .maybeSingle();

  if (record.error || !record.data) return null;
  return parseCredentials(record.data.credentials);
}

export async function getWhatsAppIntegrationByPhoneId(
  db: SupabaseClient<Database>,
  phoneNumberId: string,
): Promise<{ tenantId: string; credentials: WhatsAppCredentials } | null> {
  const record = await fetchIntegration(db, { "credentials->>phoneNumberId": phoneNumberId });
  if (!record) return null;
  return { tenantId: record.tenant_id, credentials: record.credentials_parsed };
}

export async function getWhatsAppIntegrationByVerifyToken(
  db: SupabaseClient<Database>,
  verifyToken: string,
): Promise<{ tenantId: string; credentials: WhatsAppCredentials } | null> {
  const record = await fetchIntegration(db, { "credentials->>verifyToken": verifyToken });
  if (!record) return null;
  return { tenantId: record.tenant_id, credentials: record.credentials_parsed };
}

export type TenantTemplateConfig = {
  metaTemplateName?: string | null;
  status?: string | null;
};

export async function getTenantTemplateMap(
  db: SupabaseClient<Database>,
  tenantId: string,
): Promise<Map<string, TenantTemplateConfig>> {
  const map = new Map<string, TenantTemplateConfig>();
  const { data } = await db
    .from("agenda_message_templates")
    .select("name, meta_template_name, status")
    .eq("tenant_id", tenantId);

  for (const row of (data ?? []) as Array<Pick<TemplateRow, "name" | "meta_template_name" | "status">>) {
    map.set(row.name, {
      metaTemplateName: row.meta_template_name,
      status: row.status,
    });
  }

  return map;
}
