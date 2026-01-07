import { notFound } from "next/navigation";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";
import { BookingFlow, BookingLocation, BookingProvider, BookingService } from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";

type TenantRow = Pick<Database["public"]["Tables"]["agenda_tenants"]["Row"], "id" | "name">;

type ServiceRow = Pick<
  Database["public"]["Tables"]["agenda_services"]["Row"],
  "id" | "name" | "description" | "duration_minutes" | "price_minor_units" | "currency" | "color" | "active" | "sort_order"
>;

type ProviderRow = Pick<
  Database["public"]["Tables"]["agenda_providers"]["Row"],
  "id" | "full_name" | "bio" | "color" | "default_location_id" | "active"
>;

type LocationRow = Pick<Database["public"]["Tables"]["agenda_locations"]["Row"], "id" | "name" | "address">;

export default async function BookingPage({ params }: { params: { tenantId: string } }) {
  if (!serviceClient) {
    throw new Error("Supabase service client is not configured");
  }

  const tenantId = params.tenantId;
  const db = serviceClient;

  const [tenantRes, servicesRes, providersRes, locationsRes] = await Promise.all([
    db.from("agenda_tenants").select("id, name").eq("id", tenantId).maybeSingle<TenantRow>(),
    db
      .from("agenda_services")
      .select(
        "id, name, description, duration_minutes, price_minor_units, currency, color, active, sort_order"
      )
      .eq("tenant_id", tenantId)
      .order("active", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<ServiceRow[]>(),
    db
      .from("agenda_providers")
      .select("id, full_name, bio, color, default_location_id, active")
      .eq("tenant_id", tenantId)
      .order("active", { ascending: false })
      .order("full_name", { ascending: true })
      .returns<ProviderRow[]>(),
    db
      .from("agenda_locations")
      .select("id, name, address")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true })
      .returns<LocationRow[]>(),
  ]);

  if (!tenantRes.data) {
    notFound();
  }

  const services: BookingService[] = (servicesRes.data ?? [])
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

  const providers: BookingProvider[] = (providersRes.data ?? [])
    .filter((provider) => provider.active)
    .map((provider) => ({
      id: provider.id,
      full_name: provider.full_name,
      bio: provider.bio,
      color: provider.color,
      default_location_id: provider.default_location_id,
    }));

  const locations: BookingLocation[] = (locationsRes.data ?? []).map((location) => ({
    id: location.id,
    name: location.name,
    address: location.address,
  }));

  if (locations.length === 0) {
    throw new Error("Esta cuenta todavía no tiene ubicaciones configuradas");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Agenda Online</p>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">{tenantRes.data.name}</h1>
          <p className="max-w-2xl text-lg text-slate-200">
            Reservá tu turno en segundos. Elegí el tratamiento, conocé los profesionales disponibles y confirmá tu
            cupo sin llamadas ni chat.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <span className="rounded-full border border-white/15 px-4 py-1">
              {services.length} tratamientos activos
            </span>
            <span className="rounded-full border border-white/15 px-4 py-1">
              {providers.length} profesionales
            </span>
            <span className="rounded-full border border-white/15 px-4 py-1">{locations.length} sedes</span>
          </div>
        </header>

        <BookingFlow
          tenantId={tenantId}
          tenantName={tenantRes.data.name}
          services={services}
          providers={providers}
          locations={locations}
        />
      </div>
    </div>
  );
}
