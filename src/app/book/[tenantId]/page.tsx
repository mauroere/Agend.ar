import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { serviceClient } from "@/lib/supabase/service";
import { Database } from "@/types/database";
import { BookingFlow, BookingLocation, BookingProvider, BookingService } from "@/components/booking/BookingFlow";
import { getTenantHeaderInfo } from "@/server/tenant-headers";
import { findTenantByPublicIdentifier } from "@/server/tenant-routing";

export const dynamic = "force-dynamic";

type TenantMetadata = {
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroTagline?: string | null;
  accentColor?: string | null;
  accentGradient?: string | null;
  buttonText?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  schedule?: string | null;
};

type ServiceRow = Pick<
  Database["public"]["Tables"]["agenda_services"]["Row"],
  "id" | "name" | "description" | "duration_minutes" | "price_minor_units" | "currency" | "color" | "image_url" | "active" | "sort_order"
>;

type ProviderRow = Pick<
  Database["public"]["Tables"]["agenda_providers"]["Row"],
  "id" | "full_name" | "bio" | "color" | "default_location_id" | "active"
>;

type LocationRow = Pick<Database["public"]["Tables"]["agenda_locations"]["Row"], "id" | "name" | "address">;

export default async function BookingPage({ params }: { params: { tenantId?: string } }) {
  if (!serviceClient) {
    throw new Error("Supabase service client is not configured");
  }

  const headerBag = headers();
  const headerInfo = getTenantHeaderInfo(headerBag);
  const slugOrIdFromParams = params?.tenantId ?? null;

  const resolveByParam = async () => {
    if (!slugOrIdFromParams) return null;
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrIdFromParams);
    return findTenantByPublicIdentifier({ id: looksLikeUuid ? slugOrIdFromParams : null, slug: slugOrIdFromParams });
  };

  const resolveByHeader = async () => {
    if (!headerInfo.internalId && !headerInfo.slug) return null;
    return findTenantByPublicIdentifier({ id: headerInfo.internalId, slug: headerInfo.slug });
  };

  const tenantRecord = (await resolveByParam()) ?? (await resolveByHeader());

  if (!tenantRecord) {
    notFound();
  }

  const tenantId = tenantRecord.id;
  const branding = (tenantRecord.public_metadata ?? {}) as TenantMetadata;
  const db = serviceClient;

  const [servicesRes, providersRes, locationsRes] = await Promise.all([
    db
      .from("agenda_services")
      .select(
        "id, name, description, duration_minutes, price_minor_units, currency, color, image_url, active, sort_order"
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
      image_url: service.image_url,
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

  const heroTitle = branding.heroTitle ?? tenantRecord.name;
  const heroSubtitle =
    branding.heroSubtitle ??
    "Reservá tu turno en segundos. Elegí el tratamiento, conocé los profesionales disponibles y confirmá tu cupo sin llamadas ni chat.";
  const heroTagline = branding.heroTagline ?? "Agenda Online";
  const accentColor = branding.accentColor ?? "#a855f7";
  const accentGradient = branding.accentGradient ?? null;
  const buttonText = branding.buttonText ?? "Reservar turno";
  const logoUrl = branding.logoUrl ?? null;
  const heroImageUrl =
    branding.heroImageUrl ??
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1400&q=80";
  const contactPhone = branding.contactPhone ?? null;
  const contactPhoneDigits = contactPhone?.replace(/\D/g, "") ?? null;
  const whatsappLink = contactPhoneDigits
    ? `https://wa.me/${contactPhoneDigits}?text=${encodeURIComponent(`Hola! Quiero reservar en ${tenantRecord.name}.`)}`
    : null;
  const accentSurfaceStyle = accentGradient ? { backgroundImage: accentGradient } : { backgroundColor: accentColor };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16">
        <section className="rounded-[48px] border border-slate-100 bg-white/95 p-10 shadow-[0_40px_120px_rgba(15,23,42,0.08)]">
          <div className="grid gap-12 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <Image src={logoUrl} alt={tenantRecord.name} width={160} height={48} className="h-10 w-auto" />
                ) : (
                  <span className="text-xs uppercase tracking-[0.4em] text-slate-500">{heroTagline}</span>
                )}
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                  {heroTagline}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Reservá sin fricción</p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-900 md:text-5xl" style={{ color: accentColor }}>
                  {heroTitle}
                </h1>
              </div>
              <p className="max-w-2xl text-base text-slate-600 md:text-lg">{heroSubtitle}</p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                {[
                  "Elegí el tratamiento",
                  "Seleccioná profesional",
                  "Confirmá fecha y datos",
                ].map((chip) => (
                  <span key={chip} className="rounded-full border border-slate-200 px-4 py-2">
                    {chip}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#catalog"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white"
                  style={accentSurfaceStyle}
                >
                  {buttonText}
                </a>
                <a
                  href="#catalog"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-6 py-3 text-sm text-slate-700 transition hover:border-slate-900"
                >
                  Ver pasos
                </a>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { title: "Tratamiento", detail: "Catálogo con fotos reales" },
                  { title: "Profesional", detail: "Elegí quién te atiende" },
                  { title: "Confirmación", detail: "WhatsApp + recordatorios" },
                ].map((step, index) => (
                  <div key={step.title} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <div className="relative overflow-hidden rounded-[36px] border border-slate-100 bg-slate-100/60 p-4">
                <div
                  className="h-72 rounded-[28px]"
                  style={{
                    backgroundImage: `linear-gradient(110deg, rgba(15,23,42,0.15), rgba(15,23,42,0.35)), url(${heroImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="mt-5 grid gap-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-100 bg-white/90 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Agenda visible</p>
                    <p className="text-sm text-slate-600">Disponibilidad minuto a minuto y confirmación automática.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white/90 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recordatorios</p>
                    <p className="text-sm text-slate-600">Te avisamos 24 hs antes y podés reprogramar desde el mensaje.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <BookingFlow
          tenantId={tenantId}
          tenantName={tenantRecord.name}
          services={services}
          providers={providers}
          locations={locations}
          ctaLabel={buttonText}
          accentColor={accentColor}
          accentGradient={accentGradient ?? undefined}
        />
      </div>
      {whatsappLink ? (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Chatear por WhatsApp"
          className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_20px_45px_rgba(16,185,129,0.4)] transition hover:-translate-y-0.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M21 12.1c0 4.5-3.7 8.1-8.3 8.1-1.5 0-2.9-.4-4.1-1.2L3 21l1.1-5.1c-.8-1.2-1.2-2.7-1.2-4.2C3 7.2 6.7 3.6 11.3 3.6s9.7 3.6 9.7 8.5z" />
            <path d="M15.3 14.1c-.2.4-.9.7-1.3.8-.3.1-.6.1-.9.1-.9 0-2.1-.6-3-1.5-.8-.8-1.5-2-1.5-3 0-.3 0-.6.1-.9.1-.4.4-1.1.8-1.3.1-.1.2-.2.4-.2.1 0 .2 0 .3.2.2.4.6 1.5.6 1.6 0 .1 0 .2-.1.3l-.3.5c-.1.1-.1.2 0 .4.2.4.7 1.1 1.4 1.8.7.7 1.5 1.2 1.9 1.4.1.1.3.1.4 0l.5-.3c.1-.1.2-.1.3-.1.1 0 1.2.4 1.6.6.2.1.2.2.2.3-.1.2-.2.3-.3.4z" />
          </svg>
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}
