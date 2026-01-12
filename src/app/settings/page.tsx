import { Shell } from "@/components/layout/Shell";
import { Database } from "@/types/database";
import { AutopilotSettings } from "@/components/settings/AutopilotSettings";
import { UsersSettings } from "@/components/settings/UsersSettings";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { ServicesSettings } from "@/components/settings/ServicesSettings";
import { ProvidersSettings } from "@/components/settings/ProvidersSettings";
import { MicrositeSettings } from "@/components/settings/MicrositeSettings";
import { LocationsSettings } from "@/components/settings/LocationsSettings";
import { MessageLogsSettings } from "@/components/settings/MessageLogsSettings";
import { requireTenantSession } from "@/server/auth";

type LocationRow = Pick<
  Database["public"]["Tables"]["agenda_locations"]["Row"],
  "id" | "name" | "timezone" | "default_duration" | "buffer_minutes"
>;

export default async function SettingsPage() {
  const { supabase, tenantId } = await requireTenantSession();
  const { data: locations } = await supabase
    .from("agenda_locations")
    .select("id, name, timezone, default_duration, buffer_minutes")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .returns<LocationRow[]>();

  const locationOptions = (locations ?? []).map((loc) => ({ id: loc.id, name: loc.name }));

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-2">
        <MicrositeSettings />
        <LocationsSettings />
        <ServicesSettings />
        <ProvidersSettings locations={locationOptions} />
        <AutopilotSettings />
        <UsersSettings />
        <IntegrationsSettings />
        <MessageLogsSettings />
      </div>
    </Shell>
  );
}
