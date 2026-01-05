import { endOfDay, format, startOfDay } from "date-fns";
import { Shell } from "@/components/layout/Shell";
import { TodayInbox } from "@/components/today/TodayInbox";
import { LocationSwitcher } from "@/components/location/LocationSwitcher";
import { Database } from "@/types/database";
import { requireTenantSession } from "@/server/auth";

type AppointmentRow = Database["public"]["Tables"]["agenda_appointments"]["Row"] & {
  agenda_patients: Pick<Database["public"]["Tables"]["agenda_patients"]["Row"], "full_name"> | null;
};
type LocationRow = Pick<Database["public"]["Tables"]["agenda_locations"]["Row"], "id" | "name">;

export default async function TodayPage({ searchParams }: { searchParams: { location?: string } }) {
  const { supabase, tenantId } = await requireTenantSession();
  const { data: locationRows } = await supabase
    .from("agenda_locations")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  const locations = (locationRows as LocationRow[] | null) ?? [];
  const activeLocationId = searchParams.location && locations.some((l) => l.id === searchParams.location)
    ? searchParams.location
    : locations[0]?.id;
  const start = startOfDay(new Date()).toISOString();
  const end = endOfDay(new Date()).toISOString();

  const { data } = await supabase
    .from("agenda_appointments")
    .select("id, start_at, status, agenda_patients:patient_id(full_name)")
    .eq("tenant_id", tenantId)
    .eq("location_id", activeLocationId ?? undefined)
    .gte("start_at", start)
    .lte("start_at", end)
    .order("start_at", { ascending: true })
    .returns<AppointmentRow[]>();

  const items = (data ?? []).map((appt) => {
    const status: "pending" | "confirmed" | "risk" = appt.status === "confirmed"
      ? "confirmed"
      : appt.status === "reschedule_requested" || appt.status === "canceled"
        ? "risk"
        : "pending";
    const action: "confirm" | "cancel" = status === "confirmed" ? "cancel" : "confirm";
    return {
      id: appt.id,
      patient: appt.agenda_patients?.full_name ?? "Paciente",
      time: format(new Date(appt.start_at), "HH:mm"),
      status,
      action,
    };
  });

  return (
    <Shell>
      <div className="mb-4 flex justify-end">
        <LocationSwitcher
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          activeId={activeLocationId ?? locations[0]?.id ?? ""}
        />
      </div>
      <TodayInbox items={items} />
    </Shell>
  );
}
