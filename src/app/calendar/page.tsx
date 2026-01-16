import { differenceInMinutes } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CalendarPageClient } from "@/components/calendar/CalendarPageClient";
import { Shell } from "@/components/layout/Shell";
import { LocationSwitcher } from "@/components/location/LocationSwitcher";
import { APPOINTMENT_STATUS, AppointmentStatus } from "@/lib/constants";
import { Database } from "@/types/database";
import { requireTenantSession } from "@/server/auth";
import { serviceClient } from "@/lib/supabase/service";

type CalendarRow = Database["public"]["Tables"]["agenda_appointments"]["Row"] & {
  agenda_patients: Pick<Database["public"]["Tables"]["agenda_patients"]["Row"], "full_name" | "phone_e164"> | null;
};

type ServiceRow = Pick<
  Database["public"]["Tables"]["agenda_services"]["Row"],
  "id" | "name" | "description" | "duration_minutes" | "price_minor_units" | "currency" | "color" | "active"
>;

type ProviderRow = Pick<
  Database["public"]["Tables"]["agenda_providers"]["Row"],
  "id" | "full_name" | "bio" | "avatar_url" | "color" | "default_location_id" | "active"
>;

type AnySupabaseClient = SupabaseClient<Database, "public", any>;

function asAppointmentStatus(value: string): AppointmentStatus {
  return APPOINTMENT_STATUS.includes(value as AppointmentStatus)
    ? (value as AppointmentStatus)
    : "pending";
}

function toMinutes(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const diff = differenceInMinutes(end, start);
  return Number.isFinite(diff) && diff > 0 ? diff : 30;
}

export default async function CalendarPage({ searchParams }: { searchParams: { location?: string } }) {
  const { supabase, tenantId, session } = await requireTenantSession();
  // Using serviceClient to ensure data access even if RLS is strict (consistent with TodayPage)
  const db = (serviceClient ?? supabase) as AnySupabaseClient;
  
  // 0. Check if current user is a provider to filter view
  const { data: currentProvider } = await db
    .from("agenda_providers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  const viewerProviderId = currentProvider?.id;
  
  type LocationRow = Pick<Database["public"]["Tables"]["agenda_locations"]["Row"], "id" | "name">;

  const { data: locationRows } = await db
    .from("agenda_locations")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .returns<LocationRow[]>();

  let locations: LocationRow[] = locationRows ?? [];

  if (locations.length === 0) {
    const fallbackBusinessHours = {
      mon: [["09:00", "18:00"]],
      tue: [["09:00", "18:00"]],
      wed: [["09:00", "18:00"]],
      thu: [["09:00", "18:00"]],
      fri: [["09:00", "18:00"]],
    };

    const payload: Database["public"]["Tables"]["agenda_locations"]["Insert"] = {
      tenant_id: tenantId as string,
      name: "Consultorio Principal",
      timezone: "America/Argentina/Buenos_Aires",
      business_hours: fallbackBusinessHours,
      default_duration: 30,
      buffer_minutes: 0,
    };

    const { data: createdLocation } = await db
      .from("agenda_locations")
      .insert(payload)
      .select("id, name")
      .returns<LocationRow>()
      .single();

    if (createdLocation) {
      locations = [createdLocation];
    }
  }

  const activeLocationId = searchParams.location && locations.some((l) => l.id === searchParams.location)
    ? searchParams.location
    : locations[0]?.id;

  let query = db
    .from("agenda_appointments")
    .select(
      "id, start_at, end_at, status, location_id, service_id, provider_id, service_name, internal_notes, agenda_patients:patient_id(full_name, phone_e164)"
    )
    .eq("tenant_id", tenantId)
    .gte("start_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Fetch last 30 days
    .order("start_at", { ascending: true });

  if (viewerProviderId) {
    query = query.eq("provider_id", viewerProviderId);
  }

  const { data, error } = await query;

  if (error) {
     console.error("Calendar Page fetch error", error);
  }

  const appointments = (data ?? []).map((appt) => ({
    id: appt.id,
    start: new Date(appt.start_at),
    durationMinutes: toMinutes(appt.start_at, appt.end_at),
    patient: (appt.agenda_patients as any)?.full_name ?? "Paciente",
    status: asAppointmentStatus(appt.status),
    phone: (appt.agenda_patients as any)?.phone_e164 ?? "",
    locationId: appt.location_id ?? undefined,
    serviceId: appt.service_id ?? undefined,
    providerId: appt.provider_id ?? undefined,
    service: appt.service_name ?? "",
    notes: appt.internal_notes ?? undefined,
  }));

  const locationOptions = locations.map((l) => ({ id: l.id, name: l.name }));

  const { data: services } = await db
    .from("agenda_services")
    .select("id, name, description, duration_minutes, price_minor_units, currency, color, active")
    .eq("tenant_id", tenantId)
    .order("active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<ServiceRow[]>();

  const { data: providerRows } = await db
    .from("agenda_providers")
    .select("id, full_name, bio, avatar_url, color, default_location_id, active")
    .eq("tenant_id", tenantId)
    .order("active", { ascending: false })
    .order("full_name", { ascending: true })
    .returns<ProviderRow[]>();

  const serviceOptions = (services ?? [])
    .filter((service) => service.active)
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price_minor_units: service.price_minor_units,
      currency: service.currency,
      color: service.color,
    }));

  // Fetch provider services
  const { data: spLink } = await db
    .from("agenda_provider_services" as any)
    .select("provider_id, service_id")
    .in("provider_id", providerRows?.map(p => p.id) ?? []);

  const providerOptions = (providerRows ?? [])
    .filter((provider) => provider.active)
    .map((provider) => ({
      id: provider.id,
      full_name: provider.full_name,
      bio: provider.bio,
      avatar_url: provider.avatar_url,
      color: provider.color,
      default_location_id: provider.default_location_id,
      serviceIds: spLink?.filter(l => l.provider_id === provider.id).map(l => l.service_id) ?? []
    }));

  return (
    <Shell>
      <div className="mb-4 flex justify-end">
        <LocationSwitcher
          locations={locationOptions}
          activeId={activeLocationId ?? locations[0]?.id ?? ""}
        />
      </div>
      <CalendarPageClient
        appointments={appointments}
        locations={locationOptions}
        services={serviceOptions}
        providers={providerOptions}
      />
    </Shell>
  );
}
