import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TEMPLATE_NAMES } from "@/lib/messages";
import { Database } from "@/types/database";
import { AutopilotSettings } from "@/components/settings/AutopilotSettings";
import { UsersSettings } from "@/components/settings/UsersSettings";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { requireTenantSession } from "@/server/auth";

type LocationRow = Pick<
  Database["public"]["Tables"]["agenda_locations"]["Row"],
  "name" | "timezone" | "default_duration" | "buffer_minutes"
>;

export default async function SettingsPage() {
  const { supabase, tenantId } = await requireTenantSession();
  const { data: locations } = await supabase
    .from("agenda_locations")
    .select("name, timezone, default_duration, buffer_minutes")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .returns<LocationRow[]>();

  const primaryLocation = locations?.[0];

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-2">
        <AutopilotSettings />
        <UsersSettings />
        <IntegrationsSettings />
      </div>
    </Shell>
  );
}
