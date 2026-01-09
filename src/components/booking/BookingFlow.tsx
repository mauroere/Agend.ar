"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
};

export type BookingProvider = {
  id: string;
  full_name: string;
  bio: string | null;
  color: string | null;
  default_location_id: string | null;
};

export type BookingLocation = {
  id: string;
  name: string;
  address: string | null;
};

type BookingFlowProps = {
  tenantId: string;
  tenantName: string;
  services: BookingService[];
  providers: BookingProvider[];
  locations: BookingLocation[];
  accentColor?: string;
  accentGradient?: string;
  ctaLabel?: string;
};

type DurationFilterId = "express" | "standard" | "extended";

const durationOptions: Array<{
  id: DurationFilterId;
  label: string;
  helper: string;
  predicate: (minutes: number) => boolean;
}> = [
  {
    id: "express",
    label: "Express",
    helper: "< 30 min",
    predicate: (minutes) => minutes < 30,
  },
  {
    id: "standard",
    label: "Clásicos",
    helper: "30-60 min",
    predicate: (minutes) => minutes >= 30 && minutes <= 60,
  },
  {
    id: "extended",
    label: "Premium",
    helper: "> 60 min",
    predicate: (minutes) => minutes > 60,
  },
];

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

export function BookingFlow({ tenantId, tenantName, services, providers, locations, accentColor, accentGradient, ctaLabel }: BookingFlowProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(services[0]?.id ?? null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locations[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [serviceQuery, setServiceQuery] = useState("");
  const [durationFilter, setDurationFilter] = useState<DurationFilterId | null>(null);
  const [receiveNotifications, setReceiveNotifications] = useState(true);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
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
  const serviceDuration = selectedService?.duration_minutes ?? 30;
  const filteredServices = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    const activeDuration = durationFilter
      ? durationOptions.find((option) => option.id === durationFilter)
      : null;

    return services.filter((service) => {
      const matchesQuery =
        !query ||
        service.name.toLowerCase().includes(query) ||
        (service.description ?? "").toLowerCase().includes(query);
      const matchesDuration = activeDuration ? activeDuration.predicate(service.duration_minutes) : true;
      return matchesQuery && matchesDuration;
    });
  }, [serviceQuery, services, durationFilter]);

  const accent = accentColor ?? "#a855f7";
  const accentGradientValue = accentGradient ?? null;
  const accentSoft = hexToRgba(accent, 0.15);
  const accentBackgroundValue = accentGradientValue ?? accent;
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

    if (!patientName.trim() || !patientPhone.trim()) {
      setError("Necesitamos el nombre y teléfono para confirmar");
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
      title: "Tratamiento + agenda",
      helper: "Elegí tu servicio, profesional y horario disponible.",
    },
    {
      id: 2 as const,
      title: "Tus datos",
      helper: "Completá WhatsApp y elegí si querés recordatorios.",
    },
    {
      id: 3 as const,
      title: "Confirmación",
      helper: "Te enviamos el resumen automáticamente por WhatsApp.",
    },
  ];
  const canAdvanceStageOne = Boolean(selectedService && selectedDate && selectedSlot);
  const canSubmitStageTwo = Boolean(patientName.trim() && patientPhone.trim() && selectedSlot);

  const SummaryCard = () => (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Resumen en tiempo real</p>
      <div className="mt-4 space-y-4 text-sm text-slate-600">
        <div>
          <p className="text-xs text-slate-400">Tratamiento</p>
          <p className="text-base font-semibold text-slate-900">{selectedService?.name ?? "Elegí un servicio"}</p>
          <p className="text-sm text-slate-500">{formatPrice(selectedService)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Profesional</p>
          <p className="text-base text-slate-900">{providerDescription}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Sede</p>
          <p className="text-base text-slate-900">{selectedLocation?.name ?? "Seleccioná una sede"}</p>
          {selectedLocation?.address && <p className="text-xs text-slate-400">{selectedLocation.address}</p>}
        </div>
        <div>
          <p className="text-xs text-slate-400">Fecha</p>
          <p className="text-base text-slate-900">
            {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es }) : "Elegí un día"}
          </p>
          <p className="text-sm text-slate-500">{selectedSlot ? `${selectedSlot} hs` : "Elegí horario"}</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        Al confirmar te llega un WhatsApp con toda la info y un link para reprogramar si lo necesitás.
      </div>
    </section>
  );

  const HelperCard = () => (
    <section className="rounded-[28px] border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">¿Cómo funciona?</p>
      <ul className="mt-3 space-y-2">
        <li>• Cada cambio actualiza la agenda y el resumen automáticamente.</li>
        <li>• Si no hay horario, probá con otro profesional o sede.</li>
        <li>• Podés responder al WhatsApp para reprogramar en segundos.</li>
      </ul>
    </section>
  );

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
    <div id="catalog" className="space-y-8 scroll-mt-24 text-slate-900">
      <section className="rounded-[36px] border border-slate-100 bg-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
        <div className="grid gap-4 md:grid-cols-3">
          {wizardStages.map((step) => {
            const status = stage === step.id ? "current" : stage > step.id ? "done" : "upcoming";
            return (
              <button
                key={step.id}
                type="button"
                disabled={step.id >= stage}
                onClick={() => {
                  if (step.id < stage) {
                    setStage(step.id);
                    setError(null);
                    if (step.id < 3) {
                      setSuccess(null);
                      setLastBookingSummary(null);
                    }
                  }
                }}
                className={cn(
                  "rounded-3xl border px-5 py-4 text-left transition",
                  status === "current" && "border-slate-900 bg-slate-900 text-white shadow-xl",
                  status === "done" && "border-emerald-200 bg-emerald-50/60 text-emerald-700 shadow-inner",
                  status === "upcoming" && "border-slate-100 bg-slate-50 text-slate-600"
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em]">Paso {step.id.toString().padStart(2, "0")}</p>
                <p className="mt-2 text-lg font-semibold">{step.title}</p>
                <p className="text-xs text-slate-500">{step.helper}</p>
              </button>
            );
          })}
        </div>
      </section>

      {stage === 1 && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),320px]">
          <div className="space-y-8">
            <section className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">Etapa 1 · Tratamiento</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Elegí qué querés hacerte</h3>
                  <p className="text-sm text-slate-500">
                    {emptyCatalog
                      ? "Configurá servicios desde el panel administrativo."
                      : `Mostramos ${filteredServices.length} de ${services.length} experiencias activas.`}
                  </p>
                </div>
                {!emptyCatalog ? (
                  <div className="w-full max-w-xs">
                    <Input
                      placeholder="Buscar por nombre o beneficio"
                      value={serviceQuery}
                      onChange={(event) => setServiceQuery(event.target.value)}
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900"
                    />
                  </div>
                ) : null}
              </div>

              {!emptyCatalog ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setDurationFilter(null)}
                    className={cn(
                      "rounded-full border border-slate-200 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-500",
                      !durationFilter && "border-slate-900 bg-slate-900 text-white"
                    )}
                  >
                    Todas
                  </button>
                  {durationOptions.map((option) => {
                    const active = durationFilter === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setDurationFilter(active ? null : option.id)}
                        className={cn(
                          "rounded-full border border-slate-200 px-4 py-2 text-left text-xs uppercase tracking-[0.3em] text-slate-500 transition",
                          active && "border-slate-900 bg-slate-900 text-white"
                        )}
                      >
                        <span className="font-semibold">{option.label}</span>
                        <span className="ml-2 text-[10px] normal-case tracking-normal text-slate-300">{option.helper}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {emptyCatalog ? (
                <p className="mt-6 rounded-3xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  Todavía no publicaste tratamientos para {tenantName}. Sumá tu primer servicio para habilitar la agenda.
                </p>
              ) : noResults ? (
                <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">
                  No encontramos tratamientos que coincidan con tu búsqueda.
                </div>
              ) : (
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
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
                          "group relative flex h-full flex-col overflow-hidden rounded-[30px] border border-slate-100 bg-white pb-6 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl",
                          isActive && "border-transparent ring-2 ring-offset-2 ring-offset-white"
                        )}
                        style={isActive ? { boxShadow: `0 25px 65px ${hexToRgba(cardAccent, 0.25)}` } : undefined}
                      >
                        <div
                          className="h-36 overflow-hidden rounded-[24px]"
                          style={{
                            backgroundImage: `linear-gradient(120deg, rgba(15,23,42,0.15), rgba(15,23,42,0.55)), url(${coverImage})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div className="mt-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                          <span>{service.duration_minutes} MIN</span>
                          <span>{formatPrice(service)}</span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <p className="text-xl font-semibold text-slate-900">{service.name}</p>
                          <p className="text-sm text-slate-500 line-clamp-3">
                            {service.description ?? "Agregá una descripción breve para destacar beneficios."}
                          </p>
                        </div>
                        <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                          <span>Confirmación inmediata y recordatorios automáticos.</span>
                          <span
                            className={cn(
                              "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.3em]",
                              isActive ? "border-slate-900 text-slate-900" : "border-slate-200 text-slate-400"
                            )}
                          >
                            {isActive ? "Seleccionado" : "Reservar"}
                          </span>
                        </div>
                        <span
                          className="pointer-events-none absolute inset-x-6 bottom-4 h-px"
                          style={{
                            background: isActive
                              ? cardAccent && !cardAccent.startsWith("url")
                                ? cardAccent
                                : accentBackgroundValue
                              : "linear-gradient(90deg, transparent, rgba(15,23,42,0.25), transparent)",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <article className="rounded-[28px] border border-slate-100 bg-slate-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">Profesional</p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-900">Elegí quién te atiende</h4>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedProviderId(null)}
                      className={cn(
                        "rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600 transition hover:border-slate-900",
                        !selectedProviderId && "border-slate-900 bg-slate-900 text-white"
                      )}
                    >
                      Sin preferencia
                    </button>
                    {providers.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setSelectedProviderId(provider.id)}
                        className={cn(
                          "rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600 transition hover:border-slate-900",
                          selectedProviderId === provider.id && "border-slate-900 bg-slate-900 text-white"
                        )}
                      >
                        {provider.full_name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{providerDescription}</p>
                </article>

                <article className="rounded-[28px] border border-slate-100 bg-slate-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">Sede</p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-900">Dónde querés atenderte</h4>
                  <div className="mt-4 space-y-3">
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-900"
                      value={selectedLocationId}
                      onChange={(event) => setSelectedLocationId(event.target.value)}
                    >
                      {locations.map((location) => (
                        <option key={location.id} value={location.id} className="bg-white text-slate-900">
                          {location.name}
                        </option>
                      ))}
                    </select>
                    {selectedLocation?.address && <p className="text-xs text-slate-500">{selectedLocation.address}</p>}
                  </div>
                </article>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">Etapa 1 · Agenda</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Elegí fecha y horario disponibles</h3>
                  <p className="text-sm text-slate-500">Actualizamos la agenda según el tratamiento, profesional y sede que seleccionaste.</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-slate-200 px-4 py-1 text-xs text-slate-600">
                  {serviceDuration} min
                </span>
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-[360px,1fr]">
                <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date ?? undefined)}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-2xl border border-slate-100 bg-white p-3 text-slate-900"
                  />
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Horarios disponibles</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {loadingSlots ? (
                        <p className="text-sm text-slate-600">Buscando turnos libres...</p>
                      ) : availableSlots.length > 0 ? (
                        availableSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition",
                              selectedSlot === slot && "border-slate-900 bg-slate-900 text-white"
                            )}
                          >
                            {slot} hs
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-slate-600">No hay turnos libres en esta fecha.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                    Confirmamos al instante y, si activás recordatorios, te avisamos 24 hs antes para que no se te pase.
                  </div>
                </div>
              </div>
            </section>

            <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">Con el servicio y horario listos, pasamos a tus datos.</p>
                <Button
                  type="button"
                  onClick={() => {
                    setStage(2);
                    setError(null);
                  }}
                  disabled={!canAdvanceStageOne}
                  className="h-11 rounded-2xl px-6 text-sm font-semibold text-white"
                  style={{
                    ...(accentGradientValue ? { backgroundImage: accentGradientValue } : { backgroundColor: accent }),
                    boxShadow: `0 20px 40px ${accentSoft}`,
                  }}
                >
                  Continuar con mis datos
                </Button>
              </div>
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-8">
            <SummaryCard />
            <HelperCard />
          </aside>
        </div>
      )}

      {stage === 2 && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),320px]">
          <section className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">Etapa 2 · Tus datos</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Ingresá tu contacto para confirmar</h3>
            <p className="text-sm text-slate-500">Usamos esta información para enviarte la confirmación y coordinar cualquier ajuste por WhatsApp.</p>
            <div className="mt-6 space-y-4">
              <Input
                placeholder="Nombre y apellido"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-white text-sm focus:border-slate-900"
              />
              <Input
                placeholder="Celular / WhatsApp"
                value={patientPhone}
                onChange={(event) => setPatientPhone(event.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-white text-sm focus:border-slate-900"
              />
              <Textarea
                placeholder="Notas o indicaciones (opcional)"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-[96px] rounded-2xl border-slate-200 text-sm focus:border-slate-900"
              />
            </div>
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Recordatorios por WhatsApp</p>
                <p className="text-xs text-slate-500">Te avisamos 24 hs antes. Podés desactivarlo cuando quieras.</p>
              </div>
              <Switch checked={receiveNotifications} onCheckedChange={setReceiveNotifications} aria-label="Activar recordatorios" />
            </div>
            {error ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setStage(1);
                  setError(null);
                }}
                className="rounded-2xl border border-slate-200 px-5 py-2 text-sm text-slate-600 transition hover:border-slate-900"
              >
                Volver a la agenda
              </button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmitStageTwo || submitting}
                className="h-11 rounded-2xl px-6 text-sm font-semibold text-white shadow-lg"
                style={{
                  ...(accentGradientValue ? { backgroundImage: accentGradientValue } : { backgroundColor: accent }),
                  boxShadow: `0 20px 40px ${accentSoft}`,
                }}
              >
                {submitting ? "Reservando..." : "Confirmar y enviar WhatsApp"}
              </Button>
            </div>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-8">
            <SummaryCard />
            <HelperCard />
          </aside>
        </div>
      )}

      {stage === 3 && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),320px]">
          <section className="rounded-[32px] border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-100/80">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-emerald-500">Etapa 3 · Confirmación</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Turno confirmado y enviado</h3>
            <p className="text-sm text-slate-500">Te compartimos automáticamente un mensaje con todos los datos de tu reserva.</p>
            <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {success ?? "Generamos tu mensaje de confirmación y lo estamos enviando a tu WhatsApp."}
            </div>
            {lastBookingSummary ? (
              <div className="mt-6 grid gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Paciente</p>
                  <p className="text-base font-semibold text-slate-900">{lastBookingSummary.firstName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tratamiento</p>
                  <p className="text-base font-semibold text-slate-900">{lastBookingSummary.service}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Fecha</p>
                  <p className="text-base font-semibold text-slate-900">{lastBookingSummary.date}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Horario</p>
                  <p className="text-base font-semibold text-slate-900">{lastBookingSummary.time} hs</p>
                </div>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleRestart}
                className="h-11 rounded-2xl px-6 text-sm font-semibold text-white"
                style={{
                  ...(accentGradientValue ? { backgroundImage: accentGradientValue } : { backgroundColor: accent }),
                  boxShadow: `0 20px 40px ${accentSoft}`,
                }}
              >
                Reservar otro turno
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStage(2);
                  setSuccess(null);
                  setLastBookingSummary(null);
                }}
                className="rounded-2xl border border-slate-200 px-5 py-2 text-sm text-slate-600 transition hover:border-slate-900"
              >
                Modificar datos
              </button>
            </div>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-8">
            <SummaryCard />
            <HelperCard />
          </aside>
        </div>
      )}
    </div>
  );
}
