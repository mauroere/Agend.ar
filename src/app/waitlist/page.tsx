import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/card";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { WaitlistTable } from "@/components/waitlist/WaitlistTable";
import { LocationSwitcher } from "@/components/location/LocationSwitcher";
import { Database } from "@/types/database";
import { requireTenantSession } from "@/server/auth";

type WaitlistRow = Database["public"]["Tables"]["waitlist"]["Row"] & {
  patients: Pick<Database["public"]["Tables"]["patients"]["Row"], "full_name" | "phone_e164" | "opt_out"> | null;
};
type LocationRow = Pick<Database["public"]["Tables"]["locations"]["Row"], "id" | "name">;

export default async function WaitlistPage({ searchParams }: { searchParams: { location?: string } }) {
  const { supabase, tenantId } = await requireTenantSession();
  const { data: locationRows } = await supabase
    .from("locations")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  const locations = (locationRows as LocationRow[] | null) ?? [];
  const activeLocationId = searchParams.location && locations.some((l) => l.id === searchParams.location)
    ? searchParams.location
    : locations[0]?.id;
  const { data } = await supabase
    .from("waitlist")
    .select("id, tenant_id, location_id, patient_id, priority, active, patients:patient_id(full_name, phone_e164, opt_out)")
    .eq("tenant_id", tenantId)
    .eq("location_id", activeLocationId ?? undefined)
    .eq("active", true)
    .order("priority", { ascending: true })
    .returns<WaitlistRow[]>();

  const rows = (data ?? []).map((w) => ({
    id: w.id,
    priority: w.priority,
    active: w.active,
    patient: w.patients?.full_name ?? "Paciente",
    phone: w.patients?.phone_e164 ?? "",
    optOut: w.patients?.opt_out ?? false,
  }));

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Lista de espera</h1>
          <div className="flex items-center gap-3">
            <LocationSwitcher
              locations={locations.map((l) => ({ id: l.id, name: l.name }))}
              activeId={activeLocationId ?? locations[0]?.id ?? ""}
            />
            <WaitlistForm />
          </div>
        </div>
        <Card className="p-4">
          <WaitlistTable rows={rows} />
        </Card>
      </div>
    </Shell>
  );
}
