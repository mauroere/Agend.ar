import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { format } from "date-fns";

type Integration = Database["public"]["Tables"]["agenda_integrations"]["Row"];

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Ensures we have a valid access token.
 * Refreshes it if expired.
 */
async function getValidToken(db: SupabaseClient<Database>, integration: Integration): Promise<string | null> {
  const credentials = integration.credentials as any;
  const expiresAt = new Date(credentials.expires_at ?? 0);
  const nowBuffer = new Date(Date.now() + 5 * 60 * 1000); // 5 min buffer

  if (expiresAt > nowBuffer) {
    return credentials.access_token;
  }

  // Need refresh
  if (!credentials.refresh_token || !CLIENT_ID || !CLIENT_SECRET) {
    console.error("Cannot refresh token: missing refresh token or env vars");
    return null;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: credentials.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    
    // Update DB
    const newExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
    const newCreds = { ...credentials, access_token: data.access_token, expires_at: newExpiry };
    
    await db.from("agenda_integrations").update({
      credentials: newCreds,
      updated_at: new Date().toISOString(),
    }).eq("id", integration.id);

    return data.access_token;
  } catch (e) {
    console.error("Failed to refresh Google Token", e);
    return null;
  }
}

export async function createGoogleCalendarEvent(
  db: SupabaseClient<Database>,
  appointment: Database["public"]["Tables"]["agenda_appointments"]["Row"] & { 
     // We need joined data for the event title
     agenda_patients: { full_name: string } | null,
     agenda_services: { name: string } | null
  },
  providerId: string
) {
  // 1. Find integration for the provider
  // Since we moved to Tenant-wide integration in agenda_integrations, we use tenant_id
  const tenantId = appointment.tenant_id;
  
  const { data } = await db
    .from("agenda_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", "google_calendar")
    .eq("enabled", true)
    .maybeSingle();

  const integration = data as Integration | null;

  if (!integration) return;

  const credentials = integration.credentials as any;
  if (!credentials?.access_token) return;

  const token = await getValidToken(db, integration);
  if (!token) return;

  // 2. Create Event
  const patientName = appointment.agenda_patients?.full_name ?? "Paciente";
  const serviceName = appointment.agenda_services?.name ?? "Consulta";
  
  const start = new Date(appointment.start_at);
  const end = new Date(appointment.end_at);

  const eventBody = {
    summary: `${serviceName} - ${patientName}`,
    description: `Notas: ${appointment.internal_notes ?? "Sin notas"}\nAgendado via Agend.ar`,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };

  try {
     const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
           Authorization: `Bearer ${token}`,
           "Content-Type": "application/json"
        },
        body: JSON.stringify(eventBody)
     });
     
     if (res.ok) {
        const json = await res.json();
        // Save external ID to allow updates/deletes later
        await db.from("agenda_appointments").update({
           external_calendar_id: json.id,
           external_calendar_provider: "google_calendar"
        }).eq("id", appointment.id);
     } else {
        console.error("Google Calendar API Error", await res.text());
     }
  } catch (e) {
     console.error("Google Sync Exception", e);
  }
}
