import { Shell } from "@/components/layout/Shell";
import { MyProfileSettings } from "@/components/profile/MyProfileSettings";
import { requireTenantSession } from "@/server/auth";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";

export const metadata = {
  title: "Mi Perfil Profesional | Agend.ar",
};

type LocationRow = Pick<
  Database["public"]["Tables"]["agenda_locations"]["Row"],
  "id" | "name"
>;

type ServiceRow = Pick<
  Database["public"]["Tables"]["agenda_services"]["Row"],
  "id" | "name" | "active"
>;

export default async function ProfilePage() {
  const { supabase, tenantId } = await requireTenantSession();
  
  // Use serviceClient to ensure we get the lists even if RLS is strict on 'listing'
  const db = (serviceClient || supabase) as SupabaseClient<Database>;

  // 1. Fetch Locations
  const { data: locations } = await db
    .from("agenda_locations")
    .select("id, name")
    .eq("tenant_id", tenantId ?? "")
    .order("name", { ascending: true })
    .returns<LocationRow[]>();

  // 2. Fetch Services
  const { data: services } = await db
    .from("agenda_services")
    .select("id, name, active")
    .eq("tenant_id", tenantId ?? "")
    .eq("active", true) // Only show active services to link
    .order("name", { ascending: true })
    .returns<ServiceRow[]>();

  const locationOptions = (locations ?? []).map((loc) => ({ id: loc.id, name: loc.name }));
  const serviceOptions = (services ?? []).map((svc) => ({ id: svc.id, name: svc.name }));

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Perfil</h1>
           <p className="text-slate-500">Administrá tu información, horarios y servicios asignados.</p>
        </div>
        
        <MyProfileSettings 
           locations={locationOptions} 
           services={serviceOptions} 
        />
      </div>
    </Shell>
  );
}
