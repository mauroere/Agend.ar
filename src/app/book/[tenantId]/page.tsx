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
  companyDisplayName?: string | null;
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

  const companyDisplayName = branding.companyDisplayName ?? null;
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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-slate-900 selection:text-white">
      {/* Immersive Hero Section */}
      <div className="relative h-[85vh] w-full overflow-hidden bg-slate-900">
        {/* Background Image with animated zoom effect */}
        <div 
           className="absolute inset-0 opacity-60 animate-[pulse_10s_ease-in-out_infinite] scale-105"
           style={{
             backgroundImage: `url(${heroImageUrl})`,
             backgroundSize: "cover",
             backgroundPosition: "center",
           }}
        />
        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
            {logoUrl ? (
              <div className="mb-8 p-8 bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 shadow-2xl">
                 <Image src={logoUrl} alt={companyDisplayName ?? tenantRecord.name} width={400} height={160} className="h-32 w-auto object-contain drop-shadow-md" />
              </div>
            ) : null}

            {companyDisplayName && (
                <h2 className="mb-6 text-2xl font-bold tracking-widest uppercase text-white/90 drop-shadow-sm">
                    {companyDisplayName}
                </h2>
            )}
            
            {!logoUrl && !companyDisplayName && (
               <h2 className="mb-4 text-sm font-bold tracking-[0.3em] uppercase text-white/80">{heroTagline}</h2>
            )}
            
            <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-7xl drop-shadow-lg mb-6 leading-tight">
              {heroTitle}
            </h1>
            
            <p className="max-w-lg text-lg text-slate-200 sm:text-2xl font-light mb-10 leading-relaxed drop-shadow-md">
              {heroSubtitle}
            </p>

            <a
              href="#catalog"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white px-10 py-5 text-lg font-bold text-slate-900 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <span className="mr-3">{buttonText}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 transition-transform group-hover:translate-x-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </a>
            
            <div className="absolute bottom-12 flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 rounded-full bg-white animate-bounce"></div>
            </div>
        </div>
      </div>

      <div id="catalog" className="relative z-20 -mt-10 rounded-t-[40px] bg-slate-50 px-4 pt-16 pb-24 shadow-[0_-20px_60px_rgba(0,0,0,0.15)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
            <BookingFlow
              tenantId={tenantId}
              tenantName={tenantRecord.name}
              services={services}
              providers={providers}
              locations={locations}
              ctaLabel={buttonText}
              accentColor={accentColor}
              accentGradient={accentGradient ?? undefined}
              whatsappLink={whatsappLink}
            />
        
            <div className="mt-24 border-t border-slate-200 pt-16">
              <div className="grid gap-12 lg:grid-cols-3">
                 <div className="lg:col-span-1 space-y-6 text-center lg:text-left">
                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Empresa</h4>
                        <p className="text-2xl font-bold text-slate-900">{companyDisplayName ?? tenantRecord.name}</p>
                    </div>
                    
                    {(branding.schedule) && (
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Horarios</h4>
                            <p className="text-lg text-slate-600 whitespace-pre-wrap">{branding.schedule}</p>
                        </div>
                    )}

                    {(branding.contactEmail || branding.contactPhone) && (
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Contacto</h4>
                            <div className="space-y-1 text-lg text-slate-600">
                                {branding.contactPhone && <p>{branding.contactPhone}</p>}
                                {branding.contactEmail && <p>{branding.contactEmail}</p>}
                            </div>
                        </div>
                    )}
                 </div>

                 <div className="lg:col-span-2 grid gap-8 sm:grid-cols-2">
                    {locations.map((loc) => (
                        <div key={loc.id} className="group relative overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100 transition-all hover:shadow-xl">
                            <div className="absolute inset-0 h-32 bg-slate-100">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    style={{ border: 0, opacity: 0.8 }}
                                    loading="lazy" 
                                    allowFullScreen 
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''}&q=${encodeURIComponent((loc.address ?? '') + ', Argentina')}`}
                                ></iframe>
                                {/* Fallback visual if no API key or empty address - using a static map pattern or just a placeholder */}
                                {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY && (
                                   <div className="absolute inset-0 flex items-center justify-center bg-slate-200 text-slate-400">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 opacity-50">
                                         <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                      </svg>
                                   </div>
                                )}
                            </div>
                            <div className="relative mt-32 p-6 pt-4 bg-white">
                                <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{loc.name}</h4>
                                <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                                   {loc.address || "Dirección no especificada"}
                                </p>
                                {loc.address && (
                                    <a 
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="mt-4 inline-flex items-center text-sm font-semibold text-slate-900 hover:text-indigo-600 hover:underline"
                                    >
                                        Cómo llegar
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1">
                                            <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                 </div>
              </div>
            </div>
        </div>
      </div>
      
      {whatsappLink ? (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Chatear por WhatsApp"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-[#25D366] px-6 py-4 text-base font-bold text-white shadow-[0_10px_40px_rgba(37,211,102,0.4)] transition-all duration-300 hover:scale-110 hover:-translate-y-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path fillRule="evenodd" clipRule="evenodd" d="M18.403 5.633A8.919 8.919 0 0 0 12.053 3c-4.948 0-8.976 4.027-8.978 8.977 0 1.582.413 3.126 1.198 4.488L3 21.116l4.759-1.249a8.981 8.981 0 0 0 4.29 1.093h.004c4.947 0 8.975-4.026 8.977-8.977a8.926 8.926 0 0 0-2.627-6.35m-6.35 13.812h-.003a7.446 7.446 0 0 1-3.798-1.041l-.272-.162-2.824.741.753-2.753-.177-.282a7.448 7.448 0 0 1-1.141-3.971c.002-4.114 3.349-7.461 7.465-7.461a7.413 7.413 0 0 1 5.275 2.188 7.42 7.42 0 0 1 2.183 5.279c-.002 4.114-3.349 7.462-7.461 7.462m4.093-5.589c-.225-.113-1.327-.655-1.533-.73-.205-.075-.354-.112-.504.112-.15.224-.579.73-.71.88-.131.15-.262.169-.486.056-.224-.113-.945-.349-1.801-1.113-.667-.595-1.117-1.329-1.248-1.554-.131-.225-.014-.347.099-.458.101-.1.224-.261.336-.393.112-.131.149-.224.224-.374.075-.149.037-.28-.019-.393-.056-.113-.504-1.214-.69-1.663-.181-.435-.366-.376-.504-.383-.131-.006-.28-.008-.429-.008-.15 0-.393.056-.6.28-.206.225-.785.767-.785 1.871 0 1.104.804 2.171.916 2.32.112.15 1.582 2.415 3.832 3.387.536.231.954.369 1.279.473.536.171 1.024.147 1.409.089.429-.064 1.327-.542 1.514-1.066.187-.524.187-.973.131-1.065-.056-.092-.206-.149-.43-.261" />
          </svg>
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      ) : null}
    </div>
  );
}
