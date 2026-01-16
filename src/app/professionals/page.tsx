import { Shell } from "@/components/layout/Shell";
import { Database } from "@/types/database";
import { ServicesSettings } from "@/components/settings/ServicesSettings";
import { ProvidersSettings } from "@/components/settings/ProvidersSettings";
import { requireTenantSession } from "@/server/auth";
import { serviceClient } from "@/lib/supabase/service";
import { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

type LocationRow = Pick<
  Database["public"]["Tables"]["agenda_locations"]["Row"],
  "id" | "name" | "timezone" | "default_duration" | "buffer_minutes"
>;

export default async function ProfessionalsPage() {
  const { supabase, session, tenantId } = await requireTenantSession();
  
  // Explicit cast to unify the client type and avoid overload errors
  const db = (serviceClient || supabase) as SupabaseClient<Database>;

  // Check Permissions (Only Owner)
  const { data: userProfile } = await db
    .from("agenda_users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (userProfile?.role !== "owner") {
     redirect("/calendar");
  }

  const { data: locations } = await db
    .from("agenda_locations")
    .select("id, name, timezone, default_duration, buffer_minutes")
    .eq("tenant_id", tenantId!)
    .order("name", { ascending: true })
    .returns<LocationRow[]>();

  const locationOptions = (locations ?? []).map((loc) => ({ id: loc.id, name: loc.name }));

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-2">
        <ServicesSettings />
        <ProvidersSettings locations={locationOptions} />
      </div>
    </Shell>
  );
}
