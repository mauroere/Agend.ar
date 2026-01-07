"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type BookingService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_minor_units: number | null;
  currency: string;
  color: string | null;
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
};

const gradientPalette = [
  "from-rose-500/20",
  "from-sky-500/20",
  "from-emerald-500/20",
  "from-indigo-500/20",
];

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

export function BookingFlow({ tenantId, tenantName, services, providers, locations }: BookingFlowProps) {
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

      setSuccess(
        `¡Listo ${patientName.split(" ")[0] ?? ""}! Reservamos ${selectedService.name.toLowerCase()} el ${format(
          start,
          "dd/MM"
        )} a las ${format(start, "HH:mm")} hs.`
      );
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

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-lg shadow-slate-950/20">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Paso 1</p>
              <h3 className="text-lg font-semibold text-white">Elegí tu tratamiento</h3>
            </div>
            <span className="text-sm text-slate-300">
              {services.length > 0 ? `${services.length} opciones` : "Configurá servicios en el panel"}
            </span>
          </div>
          {services.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/30 p-4 text-sm text-slate-200">
              Todavía no hay servicios publicados para {tenantName}.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {services.map((service, index) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={cn(
                    "group rounded-2xl border border-white/15 bg-white/5 p-4 text-left transition hover:border-white/40",
                    selectedServiceId === service.id && "border-white bg-white/20"
                  )}
                >
                  <div className={cn("rounded-full px-3 py-1 text-xs font-semibold text-white", gradientPalette[index % gradientPalette.length])}>
                    {service.duration_minutes} min
                  </div>
                  <p className="mt-3 text-base font-semibold text-white">{service.name}</p>
                  {service.description && (
                    <p className="mt-2 text-sm text-slate-200 line-clamp-2">{service.description}</p>
                  )}
                  <p className="mt-4 text-sm font-semibold text-slate-50">{formatPrice(service)}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Paso 2</p>
            <h3 className="text-lg font-semibold text-white">Elegí quién te atiende</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSelectedProviderId(null)}
                className={cn(
                  "rounded-full border border-white/15 px-5 py-2 text-sm text-white transition",
                  !selectedProviderId && "border-white bg-white/20"
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
                    "rounded-full border border-white/15 px-5 py-2 text-sm text-white transition",
                    selectedProviderId === provider.id && "border-white bg-white/20"
                  )}
                >
                  {provider.full_name}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-200">{providerDescription}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Paso 3</p>
            <h3 className="text-lg font-semibold text-white">Sede</h3>
            <div className="mt-4 space-y-3">
              <select
                className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-3 text-sm text-white focus:border-white"
                value={selectedLocationId}
                onChange={(event) => setSelectedLocationId(event.target.value)}
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id} className="bg-slate-900 text-white">
                    {location.name}
                  </option>
                ))}
              </select>
              {selectedLocation?.address && (
                <p className="text-xs text-slate-200">{selectedLocation.address}</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-lg shadow-slate-950/10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Paso 4</p>
              <h3 className="text-lg font-semibold text-white">Elegí día y horario</h3>
            </div>
            <span className="text-sm text-slate-200">{serviceDuration} min</span>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => setSelectedDate(date ?? undefined)}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-2xl border border-white/10 bg-white/5 text-white"
            />
            <div className="flex flex-col">
              <p className="text-xs text-slate-200">Horarios disponibles</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {loadingSlots ? (
                  <p className="text-sm text-slate-200">Buscando turnos libres...</p>
                ) : availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "rounded-full border border-white/15 px-4 py-2 text-sm text-white transition",
                        selectedSlot === slot && "border-white bg-white/20"
                      )}
                    >
                      {slot} hs
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-200">No hay turnos libres en esta fecha.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-lg shadow-slate-950/30">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Paso 5</p>
          <h3 className="text-lg font-semibold text-white">Tus datos</h3>
          <div className="mt-4 space-y-4">
            <Input
              placeholder="Nombre y apellido"
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
              className="border-white/20 bg-transparent text-white placeholder:text-slate-300"
            />
            <Input
              placeholder="WhatsApp"
              value={patientPhone}
              onChange={(event) => setPatientPhone(event.target.value)}
              className="border-white/20 bg-transparent text-white placeholder:text-slate-300"
            />
            <Textarea
              placeholder="Notas o indicaciones"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[90px] border-white/20 bg-transparent text-white placeholder:text-slate-300"
            />
          </div>
          <div className="mt-4 space-y-3">
            {error && <p className="rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{error}</p>}
            {success && (
              <p className="rounded-2xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100">
                {success}
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-4 h-12 w-full rounded-2xl bg-white text-slate-900 transition hover:translate-y-0.5"
          >
            {submitting ? "Reservando..." : "Confirmar turno"}
          </Button>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-950/30 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Resumen</p>
          <div className="mt-4 space-y-4 text-sm text-slate-200">
            <div>
              <p className="text-xs text-slate-400">Tratamiento</p>
              <p className="text-base font-semibold text-white">{selectedService?.name ?? "Elegí un servicio"}</p>
              <p className="text-sm text-slate-300">{formatPrice(selectedService)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Profesional</p>
              <p className="text-base text-white">{providerDescription}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Sede</p>
              <p className="text-base text-white">{selectedLocation?.name ?? "Sin definir"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Fecha</p>
              <p className="text-base text-white">
                {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es }) : "Elegí un día"}
              </p>
              <p className="text-sm text-slate-300">{selectedSlot ? `${selectedSlot} hs` : "Elegí horario"}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
            Confirmamos por WhatsApp y te recordamos 24 hs antes. Podés reprogramar respondiento el mensaje.
          </div>
        </section>
      </div>
    </div>
  );
}
