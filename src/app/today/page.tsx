import { endOfDay, format, startOfDay, differenceInMinutes, addHours, parseISO } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Shell } from "@/components/layout/Shell";
import { TodayInbox } from "@/components/today/TodayInbox";
import { LocationSwitcher } from "@/components/location/LocationSwitcher";
import { AppointmentToolbar } from "@/components/today/AppointmentToolbar";
import { HistoryList } from "@/components/today/HistoryList";
import { Database } from "@/types/database";
import { requireTenantSession } from "@/server/auth";
import { serviceClient } from "@/lib/supabase/service";
import { APPOINTMENT_STATUS, AppointmentStatus } from "@/lib/constants";

type AppointmentRow = Database["public"]["Tables"]["agenda_appointments"]["Row"] & {
  agenda_patients: Pick<Database["public"]["Tables"]["agenda_patients"]["Row"], "full_name" | "phone_e164"> | null;
  agenda_services: Pick<Database["public"]["Tables"]["agenda_services"]["Row"], "name"> | null;
  agenda_providers: Pick<Database["public"]["Tables"]["agenda_providers"]["Row"], "full_name"> | null;
  agenda_locations: Pick<Database["public"]["Tables"]["agenda_locations"]["Row"], "name"> | null;
};
type LocationRow = Pick<Database["public"]["Tables"]["agenda_locations"]["Row"], "id" | "name" | "timezone">;
type ServiceRow = Pick<Database["public"]["Tables"]["agenda_services"]["Row"], "id" | "name" | "description" | "duration_minutes" | "price_minor_units" | "currency" | "color" | "active" | "sort_order">;
type ProviderRow = Pick<Database["public"]["Tables"]["agenda_providers"]["Row"], "id" | "full_name" | "bio" | "avatar_url" | "color" | "default_location_id" | "active">;

type AnySupabaseClient = SupabaseClient<Database, "public", any>;

function asAppointmentStatus(value: string): AppointmentStatus {
  return APPOINTMENT_STATUS.includes(value as AppointmentStatus)
    ? (value as AppointmentStatus)
    : "pending";
}

export default async function TodayPage({ 
    searchParams 
}: { 
    searchParams: { location?: string; date?: string; view?: string } 
}) {
  const { supabase, tenantId } = await requireTenantSession();
  const db = (serviceClient ?? supabase) as AnySupabaseClient;

  const viewMode = searchParams.view === "history" ? "history" : "day";
  const dateParam = searchParams.date; 

  // 1. Fetch Locations (to determine Timezone)
  const { data: locationRows } = await db
    .from("agenda_locations")
    .select("id, name, timezone")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .returns<LocationRow[]>();

  const locations: LocationRow[] = locationRows ?? [];
  const activeLocationId = searchParams.location && locations.some((l) => l.id === searchParams.location)
    ? searchParams.location
    : locations[0]?.id;

  const activeLocation = locations.find(l => l.id === activeLocationId);
  const timeZone = activeLocation?.timezone ?? "America/Argentina/Buenos_Aires";

  // 2. Determine Query Range or Limit based on Mode
  let query = db
    .from("agenda_appointments")
    // Note: Added explicit joins for History View
    .select(`
        id, start_at, end_at, status, location_id, service_id, provider_id, service_name, internal_notes, 
        agenda_patients:patient_id(full_name, phone_e164),
        agenda_services:service_id(name),
        agenda_providers:provider_id(full_name),
        agenda_locations:location_id(name)
    `)
    .eq("tenant_id", tenantId);

  let currentDate: Date;

  if (viewMode === "history") {
     // History Mode: Fetch last 100 appointments desc
     query = query.order("start_at", { ascending: false }).limit(100);
     currentDate = new Date(); // Fallback for UI
  } else {
     // Day Mode: Filter by range
     const now = new Date();
     // If dateParam is present, parse it (YYYY-MM-DD), else use now
     const targetDate = dateParam ? parseISO(dateParam) : now;
     currentDate = targetDate;

     const zonedTarget = toZonedTime(targetDate, timeZone);
     const startZoned = startOfDay(zonedNowFilter(zonedTarget)); 
     const endZoned = endOfDay(zonedNowFilter(zonedTarget)); 

     // Robust +/- 6 hours buffer
     const startParam = addHours(fromZonedTime(startZoned, timeZone), -6).toISOString();
     const endParam = addHours(fromZonedTime(endZoned, timeZone), 6).toISOString();

     query = query
        .gte("start_at", startParam)
        .lte("start_at", endParam)
        .order("start_at", { ascending: true });
  }

  function zonedNowFilter(d: Date) {
      // Helper to handle date parsing if needed, but date-fns objects are fine
      return d; 
  }

  const { data: rawAppointments } = await query.returns<AppointmentRow[]>();

  // 3. Fetch Aux Data (Services, Providers) - Only needed for Day Inbox (Modal editing)
  // We can fetch them anyway, it's not too heavy
  const { data: services } = await db
    .from("agenda_services")
    .select("id, name, description, duration_minutes, price_minor_units, currency, color, active")
    .eq("tenant_id", tenantId)
    .order("name")
    .returns<ServiceRow[]>();

  const { data: providerRows } = await db
    .from("agenda_providers")
    .select("id, full_name, bio, avatar_url, color, default_location_id, active")
    .eq("tenant_id", tenantId)
    .order("full_name")
    .returns<ProviderRow[]>();
    
  // Fetch provider services linkage
  const { data: spLink } = await db
    .from("agenda_provider_services" as any)
    .select("provider_id, service_id")
    .in("provider_id", providerRows?.map(p => p.id) ?? []);

  // 4. Transform for Client
  const appointments = (rawAppointments ?? []).map((appt) => {
    const s = new Date(appt.start_at);
    const e = new Date(appt.end_at);
    const diff = differenceInMinutes(e, s);
    const duration = diff > 0 ? diff : 30;

    return {
      id: appt.id,
      start: s.toISOString(),
      durationMinutes: duration,
      patient: appt.agenda_patients?.full_name ?? "Paciente",
      phone: appt.agenda_patients?.phone_e164 ?? "",
      status: asAppointmentStatus(appt.status),
      locationId: appt.location_id ?? undefined,
      service: appt.service_name ?? appt.agenda_services?.name ?? "",
      notes: appt.internal_notes ?? "",
      serviceId: appt.service_id ?? undefined,
      providerId: appt.provider_id ?? undefined,
      // Extra fields for History
      providerName: appt.agenda_providers?.full_name ?? "",
      locationName: appt.agenda_locations?.name ?? ""
    };
  });

  const locationOptions = locations.map((l) => ({ id: l.id, name: l.name }));
  
  const serviceOptions = (services ?? [])
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price_minor_units: service.price_minor_units,
      currency: service.currency,
      color: service.color,
    }));

  const providerOptions = (providerRows ?? [])
    .map((provider) => ({
      id: provider.id,
      full_name: provider.full_name,
      bio: provider.bio,
      avatar_url: provider.avatar_url,
      color: provider.color,
      default_location_id: provider.default_location_id,
      serviceIds: spLink?.filter((l: any) => l.provider_id === provider.id).map((l: any) => l.service_id) ?? []
    }));

  return (
    <Shell>
      <AppointmentToolbar 
        currentDate={viewMode === 'day' ? currentDate : undefined}
        view={viewMode}
      >
        <LocationSwitcher
            locations={locationOptions}
            activeId={activeLocationId ?? locations[0]?.id ?? ""}
        />
      </AppointmentToolbar>

      {viewMode === "history" ? (
         <HistoryList
            appointments={appointments.map(a => ({
                id: a.id,
                start: a.start,
                patient: a.patient,
                status: a.status,
                service: a.service,
                provider: a.providerName,
                location: a.locationName
            }))}
         />
      ) : (
         <TodayInbox
            appointments={appointments}
            locations={locationOptions}
            services={serviceOptions}
            providers={providerOptions}
         />
      )}
    </Shell>
  );
}
