import { serviceClient } from "@/lib/supabase/service";

export type BotState = 
  | "START"
  | "MENU"
  | "SELECTING_SERVICE"
  | "SELECTING_DATE"
  | "SELECTING_TIME"
  | "CONFIRMATION"
  | "HUMAN_AGENT";

export interface BotSession {
  id: string;
  tenant_id: string;
  phone_number: string;
  step: BotState;
  data: {
    userName?: string;
    serviceId?: string;
    serviceName?: string;
    date?: string; // YYYY-MM-DD
    time?: string; // HH:MM
    duration?: number;
    [key: string]: any;
  };
}

export async function getSession(tenantId: string, phone: string): Promise<BotSession | null> {
  if (!serviceClient) return null;

  const { data, error } = await serviceClient
    .from("agenda_chat_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("phone_number", phone)
    .maybeSingle();

  if (error) {
    console.error("Error fetching bot session:", error);
    return null;
  }

  return data as unknown as BotSession | null;
}

export async function createSession(tenantId: string, phone: string, initialData: any = {}): Promise<BotSession> {
  if (!serviceClient) throw new Error("Service unavailable");

  // Upsert to ensure we reset if exists or create if new
  const { data, error } = await serviceClient
    .from("agenda_chat_sessions")
    .upsert({
      tenant_id: tenantId,
      phone_number: phone,
      step: "START",
      data: initialData
    }, { onConflict: "tenant_id, phone_number" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as BotSession;
}

export async function updateSession(tenantId: string, phone: string, updates: { step?: BotState; data?: any }) {
  if (!serviceClient) throw new Error("Service unavailable");

  // If data is provided, we merge it with existing data using jsonb || operator usually, 
  // but via Supabase/PostgREST 'data' update replaces the column unless we fetch first.
  // For atomicity, it's better to read-modify-write or assume we have the latest state.
  // Let's do a smart merge here.
  
  const current = await getSession(tenantId, phone);
  if (!current) throw new Error("Session not found");

  const newData = updates.data ? { ...current.data, ...updates.data } : current.data;

  const { error } = await serviceClient
    .from("agenda_chat_sessions")
    .update({
      step: updates.step || current.step,
      data: newData,
      updated_at: new Date().toISOString()
    })
    .eq("tenant_id", tenantId)
    .eq("phone_number", phone);

  if (error) throw new Error(error.message);
}

export async function clearSession(tenantId: string, phone: string) {
  if (!serviceClient) return;

  const { error } = await serviceClient
    .from("agenda_chat_sessions")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("phone_number", phone);

  if (error) console.error("Error clearing session", error);
}
