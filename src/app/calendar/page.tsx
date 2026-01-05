import { differenceInMinutes } from "date-fns";
import { CalendarPageClient } from "@/components/calendar/CalendarPageClient";
import { Shell } from "@/components/layout/Shell";
import { LocationSwitcher } from "@/components/location/LocationSwitcher";
import { APPOINTMENT_STATUS, AppointmentStatus } from "@/lib/constants";
import { Database } from "@/types/database";
import { requireTenantSession } from "@/server/auth";

type CalendarRow = Database["public"]["Tables"]["appointments"]["Row"] & {
  patients: Pick<Database["public"]["Tables"]["patients"]["Row"], "full_name" | "phone_e164"> | null;
};

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
  const { supabase, tenantId } = await requireTenantSession();
  type LocationRow = Pick<Database["public"]["Tables"]["locations"]["Row"], "id" | "name">;

  const { data: locationRows } = await supabase
    .from("locations")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .returns<LocationRow[]>();

  const locations = locationRows ?? [];
  const activeLocationId = searchParams.location && locations.some((l) => l.id === searchParams.location)
    ? searchParams.location
    : locations[0]?.id;
  let appointmentQuery = supabase
    .from("appointments")
    .select("id, start_at, end_at, status, location_id, service_name, internal_notes, patients:patient_id(full_name, phone_e164)")
    .eq("tenant_id", tenantId);

  if (activeLocationId) {
    appointmentQuery = appointmentQuery.eq("location_id", activeLocationId);
  }

  const { data } = await appointmentQuery
    .gte("start_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .lte("start_at", new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())
    .order("start_at", { ascending: true })
    .returns<CalendarRow[]>();

  const appointments = (data ?? []).map((appt) => ({
    id: appt.id,
    start: new Date(appt.start_at),
    durationMinutes: toMinutes(appt.start_at, appt.end_at),
    patient: appt.patients?.full_name ?? "Paciente",
    status: asAppointmentStatus(appt.status),
    phone: appt.patients?.phone_e164 ?? "",
    locationId: appt.location_id ?? undefined,
    service: appt.service_name ?? "",
    notes: appt.internal_notes ?? "",
  }));

  const locationOptions = locations.map((l) => ({ id: l.id, name: l.name }));

  return (
    <Shell>
      <div className="mb-4 flex justify-end">
        <LocationSwitcher
          locations={locationOptions}
          activeId={activeLocationId ?? locations[0]?.id ?? ""}
        />
      </div>
      <CalendarPageClient appointments={appointments} locations={locationOptions} />
    </Shell>
  );
}
