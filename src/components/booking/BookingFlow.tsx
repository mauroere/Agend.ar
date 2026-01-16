"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type BookingService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_minor_units: number | null;
  currency: string;
  color: string | null;
  image_url: string | null;
  category_id?: string | null;
  prepayment_strategy?: "none" | "full" | "fixed" | null;
  prepayment_amount?: number | null;
};

export type BookingProvider = {
  id: string;
  full_name: string;
  bio: string | null;
  color: string | null;
  default_location_id: string | null;
  avatar_url: string | null;
};

export type BookingLocation = {
  id: string;
  name: string;
  address: string | null;
};

export type BookingCategory = {
  id: string;
  name: string;
};

type BookingFlowProps = {
  tenantId: string;
  tenantName: string;
  services: BookingService[];
  providers: BookingProvider[];
  locations: BookingLocation[];
  categories: BookingCategory[];
  accentColor?: string;
  accentGradient?: string;
  ctaLabel?: string;
  whatsappLink?: string | null;
  contactPhone?: string | null;
};

function hexToRgba(hex: string, alpha: number) {
  const sanitized = hex.replace("#", "");
  const expanded = sanitized.length === 3
    ? sanitized.split("").map((char) => char + char).join("")
    : sanitized;

  if (expanded.length !== 6 || Number.isNaN(Number.parseInt(expanded, 16))) {
    return `rgba(168, 85, 247, ${alpha})`;
  }

  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatPrice(service: BookingService | null) {
  if (!service || service.price_minor_units === null) {
    return "Consultar";
  }

  const formatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: service.currency,
    minimumFractionDigits: 0,
  });

  return formatter.format(service.price_minor_units / 100);
}

export function BookingFlow({ 
  tenantId, 
  tenantName, 
  services, 
  providers, 
  locations, 
  categories,
  accentColor, 
  accentGradient, 
  ctaLabel, 
  whatsappLink, 
  contactPhone 
}: BookingFlowProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(services[0]?.id ?? null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locations[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [serviceQuery, setServiceQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [receiveNotifications, setReceiveNotifications] = useState(true);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [existingUser, setExistingUser] = useState<{ name: string } | null>(null); // Added for UX
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [lastBookingSummary, setLastBookingSummary] = useState<{
    firstName: string;
    service: string;
    date: string;
    time: string;
  } | null>(null);

  const selectedService = useMemo(
    () => services.find((svc) => svc.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );
  const selectedProvider = useMemo(
    () => providers.find((prov) => prov.id === selectedProviderId) ?? null,
    [providers, selectedProviderId]
  );
  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );
  
  const computedWhatsAppUrl = useMemo(() => {
    // If a static link provided (legacy) and no phone for dynamic gen, fallback.
    // However, if we have contactPhone, we prefer dynamic generation.
    if (!contactPhone && whatsappLink) return whatsappLink;
    if (!contactPhone) return null;

    let text = `Hola! Quiero reservar en ${tenantName}.`;

    if (stage === 3 && lastBookingSummary) {
      text = `Hola! Reservé turno para ${lastBookingSummary.service} el ${lastBookingSummary.date} a las ${lastBookingSummary.time} hs. Tengo una consulta.`;
    } else if (selectedService) {
      text = `Hola! Tengo una consulta sobre el tratamiento ${selectedService.name}.`;
    }

    return `https://wa.me/${contactPhone}?text=${encodeURIComponent(text)}`;
  }, [contactPhone, whatsappLink, tenantName, selectedService, lastBookingSummary, stage]);

  const serviceDuration = selectedService?.duration_minutes ?? 30;
  const filteredServices = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();

    return services.filter((service) => {
      const matchesQuery =
        !query ||
        service.name.toLowerCase().includes(query) ||
        (service.description ?? "").toLowerCase().includes(query);
        
      const matchesCategory = categoryFilter
         ? service.category_id === categoryFilter
         : true;

      return matchesQuery && matchesCategory;
    });
  }, [serviceQuery, services, categoryFilter]);

  const accent = accentColor ?? "#a855f7";
  const accentGradientValue = accentGradient ?? null;
  const accentSoft = hexToRgba(accent, 0.15);
  // Style object for active elements (Buttons, Tabs, Progress)
  const activeStyle = accentGradientValue 
     ? { backgroundImage: accentGradientValue, color: "#ffffff", border: "none" } 
     : { backgroundColor: accent, color: "#ffffff", borderColor: accent };
  
  // Style for text-only accents (Headings, Icons)
  const textAccentStyle = { color: accent };

  // Ref container for scroll
  const containerRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleExistingUserClick = () => {
    if (emailInputRef.current) {
      emailInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      emailInputRef.current.focus();
    }
  };

  const catalogGallery = [
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1506956191951-7a3a9299fb04?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1519415943484-9fa1873496c8?auto=format&fit=crop&w=900&q=80",
  ];

  useEffect(() => {
    if (!selectedDate || !selectedLocationId) return;

    const controller = new AbortController();
    setLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot(null);

    const query = new URLSearchParams({
      tenantId,
      date: format(selectedDate, "yyyy-MM-dd"),
      locationId: selectedLocationId,
      duration: String(serviceDuration),
    });

    if (selectedProviderId) {
      query.set("providerId", selectedProviderId);
    }

    fetch(`/api/public/availability?${query.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "No pudimos cargar la disponibilidad");
        }
        return res.json();
      })
      .then((data) => {
        setAvailableSlots(Array.isArray(data.slots) ? data.slots : []);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setAvailableSlots([]);
        setError(err.message ?? "No pudimos cargar la disponibilidad");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingSlots(false);
        }
      });

    return () => controller.abort();
  }, [tenantId, selectedDate, selectedLocationId, serviceDuration, selectedProviderId]);

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedSlot || !selectedLocationId) {
      setError("Completá el servicio, la fecha y el horario");
      return;
    }

    if (!patientName.trim() || !patientPhone.trim() || !patientEmail.trim()) {
      setError("Necesitamos tu nombre, email y teléfono");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const [hours, minutes] = selectedSlot.split(":");
    const start = new Date(selectedDate);
    start.setHours(Number(hours), Number(minutes), 0, 0);

    const payload = {
      tenantId,
      patient: patientName.trim(),
      email: patientEmail.trim(),
      phone: patientPhone.trim(),
      start: start.toISOString(),
      duration: serviceDuration,
      service: selectedService.name,
      notes: notes.trim() || null,
      location_id: selectedLocationId,
      serviceId: selectedService.id,
      providerId: selectedProviderId,
      notifications_opt_in: receiveNotifications,
    };

    try {
      const res = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "No pudimos reservar el turno");
      }

      // Check Prepayment
      if (data.appointment?.status === "awaiting_payment") {
         const needsFixed = selectedService.prepayment_strategy === "fixed";
         const amount = needsFixed 
            ? (selectedService.prepayment_amount ? selectedService.prepayment_amount / 100 : 0)
            : (selectedService.price_minor_units ? selectedService.price_minor_units / 100 : 0);

         if (amount > 0) {
            try {
               const checkoutRes = await fetch("/api/checkout/mercadopago", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                     tenantId: tenantId, 
                     serviceId: selectedService.id,
                     serviceName: `Reserva: ${selectedService.name}`,
                     priceAmount: amount,
                     patientName: patientName,
                     patientEmail: patientEmail,
                     appointmentId: data.appointment.id
                  })
               });
               
               const checkoutData = await checkoutRes.json();
               if (!checkoutRes.ok) throw new Error(checkoutData.error ?? "Error al iniciar pago");
               
               if (checkoutData.initPoint) {
                  window.location.href = checkoutData.initPoint;
                  return;
               }
            } catch (payErr) {
               console.error(payErr);
               setError("El turno se reservó, pero hubo un error al iniciar el pago. Contactanos para completarlo.");
               // Fallback: mostrar éxito parcial o error
            }
         }
      }

      const firstName = patientName.split(" ")[0] ?? "";
      const formattedDate = format(start, "dd/MM");
      const formattedTime = format(start, "HH:mm");
      setLastBookingSummary({
        firstName,
        service: selectedService.name,
        date: formattedDate,
        time: formattedTime,
      });
      setSuccess(
        `¡Listo ${firstName}! Reservamos ${selectedService.name.toLowerCase()} el ${formattedDate} a las ${formattedTime} hs. Te enviamos la confirmación por WhatsApp.`
      );
      setStage(3);
      setPatientName("");
      setPatientPhone("");
      setNotes("");
    } catch (err) {
      setError((err as Error)?.message ?? "No pudimos reservar el turno");
    } finally {
      setSubmitting(false);
    }
  };

  const providerDescription = selectedProvider
    ? selectedProvider.full_name
    : "Cualquier profesional disponible";
  const emptyCatalog = services.length === 0;
  const noResults = !emptyCatalog && filteredServices.length === 0;
  const wizardStages = [
    {
      id: 1 as const,
      title: "Tratamientos disponibles",
      helper: "Seleccioná la experiencia que buscás.",
    },
    {
      id: 2 as const,
      title: "Tus datos",
      helper: "Información de contacto.",
    },
    {
      id: 3 as const,
      title: "Confirmación",
      helper: "Resumen de tu reserva.",
    },
  ];

  const canAdvanceStageOne = Boolean(selectedService && selectedDate && selectedSlot);
  const canSubmitStageTwo = Boolean(patientName.trim() && patientPhone.trim() && patientEmail.trim() && selectedSlot);

  const SummaryCard = () => (
    <section className="rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-[0_10px_30px_rgba(203,213,225,0.3)] transition-all hover:shadow-[0_15px_40px_rgba(203,213,225,0.4)]">
      <h3 className="mb-4 text-base font-bold text-slate-800 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-500">
           <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
        </svg>
        Tu reserva
      </h3>
      
      <div className="space-y-4">
        <div className="group relative overflow-hidden rounded-2xl bg-slate-50 p-4 transition-colors hover:bg-indigo-50/50">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-indigo-500 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
             </div>
             <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Servicio</p>
                <p className="text-sm font-bold text-slate-900 leading-snug">{selectedService?.name ?? "Elegir..."}</p>
             </div>
          </div>
          {selectedService && <p className="mt-2 pl-[52px] text-xs font-medium text-indigo-600">{formatPrice(selectedService)}</p>}
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-slate-50 p-4 transition-colors hover:bg-indigo-50/50">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-500 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
             </div>
             <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Profesional</p>
                <p className="text-sm font-bold text-slate-900 leading-snug">{selectedProvider ? selectedProvider.full_name : "Sin preferencia"}</p>
             </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-slate-50 p-4 transition-colors hover:bg-indigo-50/50">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-orange-500 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
             </div>
             <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">¿Cuándo?</p>
                <p className="text-sm font-bold text-slate-900 leading-snug capitalize">
                   {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es }) : "Elegir fecha..."}
                </p>
                {selectedSlot && (
                    <p className="text-sm font-medium text-indigo-600 mt-0.5">
                        {selectedSlot} hs
                    </p>
                )}
             </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-slate-50 p-4 transition-colors hover:bg-indigo-50/50">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                   <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
             </div>
             <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Lugar</p>
                <p className="text-sm font-bold text-slate-900 leading-snug">{selectedLocation ? selectedLocation.name : "..."}</p>
                {selectedLocation && selectedLocation.address && (
                    <p className="text-xs font-medium text-slate-500 mt-0.5 max-w-[180px] break-words leading-tight">
                        {selectedLocation.address}
                    </p>
                )}
             </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-100">
         <p className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Reserva segura  y rápida!
         </p>
      </div>
    </section>
  );

  const HelperCard = () => (
    <div className="mt-6 rounded-2xl bg-slate-100/50 p-4 border border-slate-100 hidden lg:block">
        <p className="text-sm font-medium text-slate-600">
           <span className="mr-2 text-lg">✨</span>
           Estamos listos para recibirte. Si tenés dudas, completá la reserva y avisanos por chat.
        </p>
    </div>
  );

  const handleEmailBlur = async () => {
    if (!patientEmail || !patientEmail.includes("@")) return;
    setCheckingEmail(true);
    try {
        const res = await fetch("/api/public/check-patient", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: patientEmail, tenantId, tenantSlug: undefined }), // tenantSlug not in props but tenantId is
        });
        const data = await res.json();
        if (data.exists) {
            setExistingUser({ name: data.name });
        } else {
            setExistingUser(null);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setCheckingEmail(false);
    }
  };

  const handleRestart = () => {
    setStage(1);
    setSuccess(null);
    setError(null);
    setLastBookingSummary(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setSelectedDate(new Date());
  };

  return (
    <div id="booking-flow" className="space-y-8 text-slate-900" ref={containerRef}>
      {/* Mobile Steps Indicator - Simplified */}
      <div className="md:hidden">
         <div className="flex gap-2">
            {[1, 2, 3].map(s => (
                <div 
                    key={s} 
                    className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", s > stage && "bg-slate-200")} 
                    style={s <= stage ? (accentGradientValue ? { backgroundImage: accentGradientValue } : { backgroundColor: accent }) : undefined}
                />
            ))}
         </div>
         <p className="mt-3 text-lg font-bold text-slate-900">{wizardStages[stage-1].title}</p>
      </div>

      {/* Desktop Simple Tabs */}
      <div className="hidden md:flex justify-center mb-12">
          <div className="inline-flex rounded-full bg-slate-100 p-1.5">
              {wizardStages.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => {
                        if (step.id < stage) setStage(step.id);
                    }}
                    disabled={step.id > stage}
                    style={stage === step.id ? activeStyle : undefined}
                    className={cn(
                        "rounded-full px-6 py-2 text-sm font-semibold transition-all duration-300",
                        stage !== step.id && "text-slate-500 hover:text-slate-700",
                        step.id > stage && "opacity-50 cursor-not-allowed hover:text-slate-500"
                    )}
                  >
                      {step.title}
                  </button>
              ))}
          </div>
      </div>

      {stage === 1 && (
        <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
          <div className="space-y-12">
            {/* Tratamiento */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">Elegí tu experiencia</h3>
                  <p className="mt-1 text-slate-500">{services.length} opciones disponibles para vos.</p>
                </div>
                {!emptyCatalog && (
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
                           <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                        </svg>
                        <input 
                           placeholder="Buscar..." 
                           value={serviceQuery}
                           onChange={(e) => setServiceQuery(e.target.value)}
                           className="h-10 w-full min-w-[200px] rounded-full border-none bg-slate-100 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900"
                        />
                    </div>
                )}
              </div>

              {!emptyCatalog && categories.length > 0 ? (
                <div className="mt-8 flex flex-wrap gap-3 pb-2">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter(null)}
                    style={!categoryFilter ? activeStyle : undefined}
                    className={cn(
                      "rounded-full border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 shadow-sm hover:shadow-md",
                      !categoryFilter 
                        ? "border-transparent text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    )}
                  >
                    Todas
                  </button>
                  {categories.map((cat) => {
                    const active = categoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryFilter(active ? null : cat.id)}
                        style={active ? activeStyle : undefined}
                        className={cn(
                          "rounded-full border px-5 py-2.5 text-left text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 shadow-sm hover:shadow-md",
                          active
                            ? "border-transparent text-white"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {emptyCatalog ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  <p className="text-lg">No hay tratamientos disponibles en este momento.</p>
                </div>
              ) : noResults ? (
                <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
                  <p className="text-lg">No encontramos resultados para tu búsqueda.</p>
                </div>
              ) : (
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredServices.map((service, index) => {
                    const isActive = selectedServiceId === service.id;
                    const coverImage =
                      service.image_url ??
                      (typeof service.color === "string" && service.color.startsWith("http")
                        ? service.color
                        : catalogGallery[index % catalogGallery.length]);
                    const cardAccent =
                      typeof service.color === "string" && !service.color.startsWith("http")
                        ? service.color
                        : accent;
                    
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSelectedServiceId(service.id)}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-[2rem] bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
                          isActive ? "ring-2 ring-slate-900 ring-offset-4" : "shadow-lg shadow-slate-200/50 hover:shadow-slate-200/80"
                        )}
                      >
                        <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                             <div 
                                className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                                style={{
                                  backgroundImage: `url(${coverImage})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }}
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                             
                             <div className="absolute top-4 right-4 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
                                {service.duration_minutes} min
                             </div>
                             
                             <div className="absolute bottom-4 left-4 text-white">
                                <p className="text-xl font-bold tracking-tight">{formatPrice(service)}</p>
                             </div>
                        </div>

                        <div className="flex flex-1 flex-col p-6">
                           <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{service.name}</h4>
                           <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1">
                            {service.description ?? "Una experiencia diseñada para tu bienestar."}
                          </p>
                          
                          <div className={cn(
                             "mt-auto flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                             isActive ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700"
                          )}>
                             <span>{isActive ? "Seleccionado" : "Elegir"}</span>
                             {isActive ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                </svg>
                             ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                             )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Selector de profesional y sede */}
            <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="rounded-[2rem] bg-slate-50 p-6 sm:p-8">
                  <h4 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-6">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm text-slate-400">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                       </svg>
                    </span>
                    Profesional
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedProviderId(null)}
                      className={cn(
                        "group relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all overflow-hidden",
                        !selectedProviderId 
                            ? "bg-slate-900 text-white shadow-md" 
                            : "bg-white text-slate-600 shadow-sm hover:shadow-md hover:text-slate-900"
                      )}
                    >
                      <div className="flex -ml-2 h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xs font-bold uppercase text-slate-500">
                          Todos
                      </div>
                      Cualquiera
                    </button>
                    {providers.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setSelectedProviderId(provider.id)}
                        className={cn(
                           "group relative flex items-center gap-2 rounded-full px-2 py-2 text-sm font-medium transition-all pr-5 overflow-hidden",
                           selectedProviderId === provider.id
                               ? "bg-slate-900 text-white shadow-md" 
                               : "bg-white text-slate-600 shadow-sm hover:shadow-md hover:text-slate-900"
                        )}
                      >
                         <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/50 bg-slate-200">
                            {provider.avatar_url ? (
                                <Image
                                  src={provider.avatar_url}
                                  alt={provider.full_name}
                                  width={64}
                                  height={64}
                                  className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-300 text-sm font-bold uppercase text-slate-600">
                                   {provider.full_name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join("")}
                                </div>
                            )}
                         </div>
                        {provider.full_name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] bg-slate-50 p-6 sm:p-8">
                  <h4 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-6">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm text-slate-400">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                       </svg>
                    </span>
                    Lugar
                  </h4>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-2xl border-none bg-white p-4 pr-10 text-base font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-900"
                      value={selectedLocationId}
                      onChange={(event) => setSelectedLocationId(event.target.value)}
                    >
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                       </svg>
                    </div>
                  </div>
                  {selectedLocation?.address && (
                      <p className="mt-3 text-sm text-slate-500 ml-1">{selectedLocation.address}</p>
                  )}
                </div>
            </div>

            {/* Calendario y Horarios */}
            <section className="rounded-[2.5rem] bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <div className="mb-8">
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">Agenda</h3>
                  <p className="mt-1 text-slate-500">Seleccioná el día y la hora que mejor te quede.</p>
              </div>

              <div className="flex flex-col gap-8 lg:flex-row">
                <div className="flex justify-center lg:justify-start">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date ?? undefined)}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-3xl border-none bg-slate-50/50 p-3 shadow-inner sm:p-6"
                    classNames={{
                        day_selected: "bg-slate-900 text-white hover:bg-slate-800 focus:bg-slate-900",
                        day_today: "bg-slate-100 text-slate-900 font-bold",
                    }}
                  />
                </div>
                
                <div className="flex-1">
                    <div className="mb-4 flex items-center justify-between">
                         <span className="text-sm font-bold uppercase tracking-wider text-slate-400">Horarios</span>
                         <span className="text-xs text-slate-400">{serviceDuration} min de duración</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4">
                      {loadingSlots ? (
                         Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-10 animate-pulse rounded-full bg-slate-100" />
                         ))
                      ) : availableSlots.length > 0 ? (
                        availableSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "relative flex items-center justify-center rounded-full py-2 px-4 text-sm font-semibold transition-all duration-200 border",
                              selectedSlot === slot 
                                ? "border-slate-900 bg-slate-900 text-white shadow-md transform scale-105" 
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            {slot}
                          </button>
                        ))
                      ) : (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-60">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-300 mb-2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-medium text-slate-500">Sin horarios disponibles</p>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            </section>

            {/* Sticky Mobile CTA */}
            <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:static md:border-none md:bg-transparent md:p-0 md:shadow-none">
                <div className="mx-auto max-w-5xl flex items-center justify-between gap-4 md:justify-end">
                    <div className="md:hidden">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Total</p>
                        <p className="font-bold text-slate-900">{formatPrice(selectedService)}</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setStage(2);
                        setError(null);
                        
                        // Scroll to container top instead of window top
                        if (containerRef.current) {
                           const yOffset = -20; // small offset for breathing room
                           const y = containerRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
                           window.scrollTo({ top: y, behavior: 'smooth' });
                        } else {
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      disabled={!canAdvanceStageOne}
                      className={cn(
                          "h-12 rounded-full px-8 text-base font-bold text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none",
                          !canAdvanceStageOne ? "bg-slate-300" : ""
                      )}
                      style={canAdvanceStageOne ? {
                        ...(accentGradientValue ? { backgroundImage: accentGradientValue } : { backgroundColor: accent }),
                        boxShadow: `0 10px 30px ${accentSoft}`,
                      } : {}}
                    >
                      Siguiente paso
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="ml-2 w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Button>
                </div>
            </div>
          </div>

          <aside className="hidden lg:block space-y-6">
             <div className="sticky top-8 space-y-6">
                <SummaryCard />
                <HelperCard />
             </div>
          </aside>
        </div>
      )}

      {stage === 2 && (
        <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="rounded-[2.5rem] bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-10">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                      <h3 className="text-2xl font-bold tracking-tight text-slate-900">Tus datos</h3>
                      <p className="mt-1 text-slate-500">¿A dónde te enviamos la confirmación?</p>
                  </div>
                  <Button onClick={handleExistingUserClick} variant="outline" size="sm" className="hidden sm:flex rounded-full text-indigo-600 border-indigo-100 bg-indigo-50 hover:bg-indigo-100">
                      Ya tengo cuenta
                  </Button>
                </div>

                <div className="grid gap-6">
                  {/* Login CTA Mobile */}
                  <div className="sm:hidden rounded-xl bg-indigo-50 p-4 mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-900">¿Ya sos paciente?</span>
                      <Button onClick={handleExistingUserClick} variant="ghost" size="sm" className="text-indigo-600 font-bold p-0 h-auto hover:bg-transparent hover:underline">Iniciá sesión</Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">Nombre completo</label>
                          <Input
                            placeholder="Ej: Juan Pérez"
                            value={patientName}
                            onChange={(event) => setPatientName(event.target.value)}
                            className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-base focus:border-slate-900 focus:ring-slate-900"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 ml-1">WhatsApp</label>
                          <Input
                            placeholder="Ej: 11 1234 5678"
                            value={patientPhone}
                            onChange={(event) => setPatientPhone(event.target.value)}
                            className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-base focus:border-slate-900 focus:ring-slate-900"
                          />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Email (para tu cuenta)</label>
                      <div className="relative">
                        <Input
                            ref={emailInputRef}
                            type="email"
                            placeholder="tu@email.com"
                            value={patientEmail}
                            onChange={(event) => setPatientEmail(event.target.value)}
                            onBlur={handleEmailBlur}
                            className={cn(
                                "h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-base focus:border-slate-900 focus:ring-slate-900",
                                existingUser && "border-indigo-300 bg-indigo-50/50"
                            )}
                        />
                        {checkingEmail && (
                            <div className="absolute right-3 top-3.5">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                            </div>
                        )}
                      </div>
                      
                      {existingUser ? (
                          <div className="rounded-lg bg-indigo-50 p-3 mt-2 flex flex-col gap-2 border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                             <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-700">
                                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A9.916 9.916 0 0010 18c2.695 0 5.13-1.07 6.793-2.61A5.99 5.99 0 0010 12z" clipRule="evenodd" />
                                   </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-indigo-900">¡Hola {existingUser.name.split(" ")[0]}!</p>
                                    <p className="text-xs text-indigo-700 leading-snug">
                                        Vemos que ya tenés cuenta. Si querés que este turno quede en tu historial, te recomendamos iniciar sesión.
                                    </p>
                                </div>
                             </div>
                             <div className="flex gap-2 pl-8">
                                <Button size="sm" variant="primary" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4">
                                    Iniciar sesión
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 text-xs text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-full px-3" onClick={() => setExistingUser(null)}>
                                    Continuar como invitado
                                </Button>
                             </div>
                          </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 ml-1">
                              Te crearemos una cuenta para que puedas ver y gestionar tus turnos. 
                              <span className="text-slate-400 block sm:inline"> Te enviaremos el acceso por mail.</span>
                          </p>
                          <p className="text-[10px] text-slate-400 italic ml-1">
                            * Política de cancelación: Se requiere aviso previo de 24hs para cambios o cancelaciones.
                          </p>
                        </div>
                      )}
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Notas adicionales (opcional)</label>
                      <Textarea
                        placeholder="Si necesitás aclarar algo sobre tu turno, escribilo acá..."
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        className="min-h-[120px] rounded-xl border-slate-200 bg-slate-50 p-4 text-base focus:border-slate-900 focus:ring-slate-900 resize-none"
                      />
                  </div>

                  <div className="rounded-2xl bg-indigo-50 p-6">
                    <div className="flex items-start gap-4">
                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-indigo-900">Recordatorios automáticos</h4>
                            <p className="mt-1 text-sm text-indigo-700">Te vamos a avisar 24 hs antes de tu turno para que no te olvides.</p>
                        </div>
                        <Switch checked={receiveNotifications} onCheckedChange={setReceiveNotifications} />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                           <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-100 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStage(1);
                          setError(null);
                        }}
                        className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        ← Volver atrás
                      </button>
                      
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmitStageTwo || submitting}
                        className={cn(
                           "h-12 rounded-full px-8 text-base font-bold text-white shadow-xl transition-all hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0",
                           submitting && "opacity-80 cursor-wait"
                        )}
                        style={{
                          ...(accentGradientValue ? { backgroundImage: accentGradientValue } : { backgroundColor: accent }),
                          boxShadow: `0 10px 30px ${accentSoft}`,
                        }}
                      >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                                Procesando...
                            </span>
                        ) : "Confirmar Reserva"}
                      </Button>
                  </div>
                </div>
             </div>
          </section>

          <aside className="hidden lg:block space-y-6">
             <div className="sticky top-8 space-y-6">
                <SummaryCard />
                <HelperCard />
             </div>
          </aside>
        </div>
      )}

      {stage === 3 && (
        <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
          <section className="animate-in zoom-in-95 duration-700">
             <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-center sm:p-16 text-white shadow-2xl">
                 {/* Background decoration */}
                 <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-slate-900 to-slate-900" />
                 
                 <div className="relative z-10 flex flex-col items-center">
                     <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)] animate-bounce">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-12 h-12 text-white">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                     </div>
                     
                     <h2 className="mb-4 text-3xl font-bold sm:text-5xl">¡Reserva Confirmada!</h2>
                     <p className="max-w-md text-lg text-slate-300 mb-8">
                        Todo listo, {lastBookingSummary?.firstName}. Ya te enviamos los detalles por WhatsApp.
                     </p>
                     
                     {lastBookingSummary && (
                         <div className="w-full max-w-md rounded-3xl bg-white/10 p-6 backdrop-blur-md border border-white/10 mb-10">
                             <div className="grid grid-cols-2 gap-y-6 text-left">
                                 <div>
                                     <p className="text-xs uppercase tracking-wider text-slate-400">Fecha</p>
                                     <p className="text-xl font-bold">{lastBookingSummary.date}</p>
                                 </div>
                                 <div>
                                     <p className="text-xs uppercase tracking-wider text-slate-400">Horario</p>
                                     <p className="text-xl font-bold">{lastBookingSummary.time} hs</p>
                                 </div>
                                 <div className="col-span-2">
                                     <p className="text-xs uppercase tracking-wider text-slate-400">Tratamiento</p>
                                     <p className="text-lg font-semibold">{lastBookingSummary.service}</p>
                                 </div>
                             </div>
                         </div>
                     )}
                     
                     <div className="flex flex-wrap justify-center gap-4">
                         <Button
                            type="button"
                            onClick={handleRestart}
                            className="h-12 rounded-full bg-white px-8 text-base font-bold text-slate-900 transition hover:bg-slate-100"
                         >
                            Reservar otro turno
                         </Button>
                         <a
                            href={computedWhatsAppUrl ?? whatsappLink ?? "#"}
                             target="_blank"
                             rel="noreferrer"
                             className="inline-flex h-12 items-center justify-center rounded-full border border-slate-700 bg-transparent px-8 text-base font-bold text-white transition hover:bg-slate-800"
                         >
                             Ir al chat
                         </a>
                     </div>
                 </div>
             </div>
          </section>

          <aside className="hidden lg:block">
             <div className="sticky top-8">
                <div className="rounded-3xl bg-slate-100 p-8 text-center border border-dashed border-slate-300">
                    <p className="text-4xl mb-4">🙌</p>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">¡Gracias por elegirnos!</h4>
                    <p className="text-slate-500">
                        Si necesitás hacer cambios, podés responder directamente al mensaje que te enviamos.
                    </p>
                </div>
             </div>
          </aside>
        </div>
      )}

      {computedWhatsAppUrl && stage !== 3 && (
        <a
          href={computedWhatsAppUrl}
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
      )}
    </div>
  );
}
