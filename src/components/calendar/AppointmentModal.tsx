"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, addMinutes, parse } from "date-fns";
import { ConsultationModal } from "@/components/medical/ConsultationModal";
import { Stethoscope } from "lucide-react";    // FIND: {isEdit ? "Guardar Cambios" : "Confirmar Turno"}
    
    // Logic: If appointment exists and is not canceled/completed, show "Atender"
import { es } from "date-fns/locale";
import { AppointmentStatus } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// Assuming component primitives exist or standard HTML
import { X, Loader2, Calendar as CalendarIcon, Clock, Check, UserPlus, Search, Info, Sparkles, Trash2, Ban } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { validateAndFormatPhone } from "@/lib/phone-utils";
import { CreatePatientDialog } from "@/components/patients/CreatePatientDialog";

// ... type definitions same ...
type LocationOption = { id: string; name: string };

type ServiceOption = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_minor_units: number | null;
  currency: string;
  color: string | null;
};

type ProviderOption = {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  color: string | null;
  default_location_id: string | null;
  serviceIds?: string[];
};

type AppointmentData = {
  id: string;
  patient: string;
  phone: string;
  start: Date;
  durationMinutes: number;
  service?: string;
  serviceId?: string;
  providerId?: string;
  notes?: string;
  locationId?: string;
  status: AppointmentStatus;
};

type FormValues = {
  patient: string;
  phone: string;
  date: Date | undefined;
  time: string;
  duration: number;
  service: string;
  serviceId?: string;
  providerId?: string;
  notes: string;
};

const INITIAL_FORM: FormValues = {
  patient: "",
  phone: "",
  date: undefined, 
  time: "",
  duration: 30,
  service: "",
  serviceId: undefined,
  providerId: undefined,
  notes: "",
};

type SimplePatient = { id: string, label: string, phone: string };

type AppointmentModalProps = {
  locations: LocationOption[];
  services: ServiceOption[];
  providers: ProviderOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  appointment?: AppointmentData;
  defaultDate?: Date;
};

export function AppointmentModal({ locations, services, providers, open: controlledOpen, onOpenChange, appointment, defaultDate }: AppointmentModalProps) {
	const isControlled = controlledOpen !== undefined;
	const [internalOpen, setInternalOpen] = useState(controlledOpen ?? false);
	const open = isControlled ? controlledOpen : internalOpen;

	const setOpen = (value: boolean) => {
		if (!isControlled) setInternalOpen(value);
		onOpenChange?.(value);
	};

	const [form, setForm] = useState<FormValues>({ ...INITIAL_FORM, date: defaultDate ?? new Date() });
	const [locationId, setLocationId] = useState<string>(locations[0]?.id ?? "");

  // Auto-select first provider if none selected
  useEffect(() => {
    if (!form.providerId && providers.length > 0) {
       // Prefer default for this location, or just first one
       const defaultForLoc = providers.find(p => p.default_location_id === locationId);
       const target = defaultForLoc ?? providers[0];
       setForm(prev => ({ ...prev, providerId: target.id }));
    }
  }, [providers, locationId, form.providerId]);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
    const [phoneError, setPhoneError] = useState<string | null>(null);
	const hasLocations = locations.length > 0;
	const router = useRouter();
	const isEdit = Boolean(appointment);

  // Advanced States
  const [patients, setPatients] = useState<SimplePatient[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const patientFieldRef = useRef<HTMLDivElement | null>(null);
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [attendOpen, setAttendOpen] = useState(false); // Medical Module
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Recommender
  const [lookingForSuggestions, setLookingForSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ date: string, slots: string[] }>>([]);

  const selectedService = useMemo(() => services.find((svc) => svc.id === form.serviceId), [services, form.serviceId]);
  const filteredProviders = useMemo(() => {
    let scoped = providers.filter((prov) => !prov.default_location_id || prov.default_location_id === locationId);
    if (form.serviceId) {
        scoped = scoped.filter(p => !p.serviceIds || p.serviceIds.length === 0 || p.serviceIds.includes(form.serviceId!));
    }
    return scoped.length > 0 ? scoped : providers;
  }, [providers, locationId, form.serviceId]);
  const selectedProvider = useMemo(
    () => providers.find((prov) => prov.id === form.providerId),
    [providers, form.providerId]
  );

  // Logic ...

  const fetchPatients = useCallback(async (query: string = "") => {
    const term = query.trim();
    // Allow empty search to fetch top patients
    setPatientLoading(true);
    try {
      const res = await fetch(`/api/patients?limit=10&q=${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(
          (data.patients ?? []).map((p: any) => ({
            id: p.id,
            label: p.full_name,
            phone: p.phone_e164,
          }))
        );
      }
    } catch (e) {
      console.error(e);
      setPatients([]);
    } finally {
      setPatientLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!patientDropdownOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (patientFieldRef.current && !patientFieldRef.current.contains(event.target as Node)) {
        setPatientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [patientDropdownOpen]);

  useEffect(() => {
    if (!open) {
      setPatientDropdownOpen(false);
    }
  }, [open]);

	useEffect(() => {
    if (isControlled) setInternalOpen(controlledOpen ?? false);
  }, [controlledOpen, isControlled]);

	useEffect(() => {
		if (appointment) {
			setForm({
				patient: appointment.patient,
				phone: appointment.phone,
				date: appointment.start,
        time: format(appointment.start, "HH:mm"),
				duration: appointment.durationMinutes,
        service: appointment.service || "",
        serviceId: appointment.serviceId,
        providerId: appointment.providerId,
				notes: appointment.notes || "",
			});
			setLocationId(appointment.locationId ?? locations[0]?.id ?? "");
		} else {
      setForm({ ...INITIAL_FORM, date: new Date() });
			setLocationId(locations[0]?.id ?? "");
		}
		setError(null);
    setAvailableSlots([]);
    setPatientQuery(appointment ? appointment.patient : "");
	}, [appointment, locations, open]);

  useEffect(() => {
     if (!form.date || !locationId || !open) return;
     
     const fetchSlots = async () => {
       setLoadingSlots(true);
       setAvailableSlots([]);
       try {
         const d = format(form.date!, "yyyy-MM-dd");
        const q = new URLSearchParams({
          date: d,
          locationId,
          duration: form.duration.toString()
        });
        if (form.providerId) {
          q.set("providerId", form.providerId);
        }
         const res = await fetch(`/api/availability?${q}`);
         if (res.ok) {
           const data = await res.json();
           setAvailableSlots(data.slots || []);
         }
       } catch (e) {
         console.error(e);
       } finally {
         setLoadingSlots(false);
       }
     };

     if (form.date) fetchSlots();
  }, [form.date, form.duration, form.providerId, locationId, open]);


  const handleChange = (key: keyof FormValues, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePatientSelect = (patient: SimplePatient) => {
    handleChange("patient", patient.label);
    handleChange("phone", patient.phone);
    setPatientQuery(patient.label);
    setPatientDropdownOpen(false);
  };

  const formatServicePrice = useCallback((service: ServiceOption) => {
    if (service.price_minor_units === null) return "Consultar";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: service.currency,
      minimumFractionDigits: 0,
    }).format(service.price_minor_units / 100);
  }, []);

  const handleSelectServiceCard = (service: ServiceOption) => {
    setForm((prev) => ({
      ...prev,
      serviceId: service.id,
      service: service.name,
      duration: service.duration_minutes,
    }));
  };

  const handleSelectProviderCard = (provider: ProviderOption) => {
    setForm((prev) => ({ ...prev, providerId: provider.id }));
    if (!appointment && provider.default_location_id) {
      setLocationId(provider.default_location_id);
    }
  };

  const handleSuggest = async () => {
    setLookingForSuggestions(true);
    setSuggestions([]);
    try {
        const q = new URLSearchParams({
            locationId,
            duration: form.duration.toString(),
            fromDate: new Date().toISOString()
        });
        if (form.providerId) q.set("providerId", form.providerId);
        
        const res = await fetch(`/api/availability/suggest?${q}`);
        if(res.ok) {
            const data = await res.json();
            setSuggestions(data.suggestions ?? []);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLookingForSuggestions(false);
    }
  };

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!hasLocations) return setError("Falta configurar Consultorio");
		if (!form.patient) return setError("Seleccione un paciente");
    if (!form.date || !form.time) return setError("Seleccione fecha y hora");
    if (!form.providerId) return setError("Debe asignar un profesional obligatoriamente");

    let startIso = "";
    if (form.date && form.time) {
        // Fix: form.date is a Date object, not a string.
        // We use the local components of the selected date (Year, Month, Day)
        // preventing timezone shifts if we were to just use .toISOString() and split.
        const y = form.date.getFullYear();
        const M = form.date.getMonth(); // 0-indexed
        const d = form.date.getDate();
        
        const [h, m] = form.time.split(":");
        
        // Construct the final date in Local System Time
        // This assumes the user is selecting "8 de Enero" meaning "8 de Enero en mi reloj actual"
        const localDate = new Date(y, M, d, Number(h), Number(m));
        startIso = localDate.toISOString();
    } else {
       return setError("Fecha inválida");
    }

    let phoneToSend = form.phone;
    if (form.phone) {
        const { isValid, formatted, error } = validateAndFormatPhone(form.phone);
        if (!isValid) {
            setPhoneError(error || "Número inválido");
            return setError("El teléfono ingresado no es válido. Corregí el formato.");
        }
        if (formatted) phoneToSend = formatted;
    }

		setLoading(true);
		setError(null);
		try {
			const endpoint = appointment ? `/api/appointments/${appointment.id}` : "/api/appointments";
			const method = appointment ? "PATCH" : "POST";
      const payload: Record<string, any> = {
            patient: form.patient,
            phone: phoneToSend,
            start: startIso,
            duration: form.duration,
            service: form.service,
            notes: form.notes,
            location_id: locationId,
          };

      if (form.serviceId) {
        payload.serviceId = form.serviceId;
      }

      if (form.providerId) {
        payload.providerId = form.providerId;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
			const result = await response.json();
			if (!response.ok) {
				setError(result.error ?? "Error al guardar");
				return;
			}
			setOpen(false);
			router.refresh();
		} catch (e) {
			setError("Error inesperado.");
		} finally {
			setLoading(false);
		}
	};

  const handleCancelAppointment = async () => {
      if (!appointment || !confirm("¿Seguro que querés cancelar este turno? Se notificará al paciente si corresponde.")) return;

      setLoading(true);
      try {
          const response = await fetch(`/api/appointments/${appointment.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "canceled" }), 
          });

          if (!response.ok) {
             const res = await response.json();
             setError(res.error || "No se pudo cancelar");
             return;
          }

          setOpen(false);
          router.refresh();
      } catch (e) {
          console.error(e);
          setError("Error al cancelar");
      } finally {
          setLoading(false);
      }
  };

  // Render logic

	if (controlledOpen === undefined && !open) {
		return (
			<Button onClick={() => setOpen(true)}>
				{appointment ? "Editar turno" : "+ Turno"}
			</Button>
		);
	}

  // We use the Dialog component correctly now instead of raw divs
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto w-full p-0 gap-0">
          <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50">
             <DialogHeader>
               <DialogTitle className="text-xl text-slate-900">{isEdit ? "Editar Turno" : "Agendar Nuevo Turno"}</DialogTitle>
               <DialogDescription className="text-slate-500">Complete la información del paciente y seleccione un bloque horario.</DialogDescription>
             </DialogHeader>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
             {/* Left Column: Intake */}
             <div className="flex-1 p-4 md:p-6 space-y-6">
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                    <Info className="h-4 w-4" />
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                     <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700">Paciente</label>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-0 text-xs text-brand-600"
                          onClick={() => {
                            setPatientDropdownOpen(false);
                            setShowCreatePatient(true);
                          }}
                        >
                          + Nuevo Paciente
                        </Button>
                     </div>
                     <div ref={patientFieldRef} className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={patientQuery}
                          placeholder="Buscar por nombre o teléfono..."
                          className="pl-10 pr-3"
                          onFocus={() => {
                            setPatientDropdownOpen(true);
                            void fetchPatients(patientQuery);
                          }}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPatientQuery(value);
                            setPatientDropdownOpen(true);
                            if (form.patient) {
                              handleChange("patient", "");
                              handleChange("phone", "");
                            }
                            void fetchPatients(value);
                          }}
                        />
                        {patientDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full z-[60] mt-2 rounded-xl border border-slate-200 bg-white shadow-2xl">
                            <div className="max-h-64 overflow-y-auto py-1">
                              {patientLoading ? (
                                <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Buscando pacientes...
                                </div>
                              ) : patients.length === 0 ? (
                                <p className="px-4 py-3 text-sm text-slate-500">No encontramos coincidencias.</p>
                              ) : (
                                <ul className="divide-y divide-slate-100">
                                  {patients.map((p) => (
                                    <li key={p.id}>
                                      <button
                                        type="button"
                                        className={cn(
                                          "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50",
                                          form.patient === p.label && "bg-slate-50"
                                        )}
                                        onClick={() => handlePatientSelect(p)}
                                      >
                                        <div className="flex flex-col text-sm">
                                          <span className="font-medium text-slate-900">{p.label}</span>
                                          <span className="text-xs text-slate-500">{p.phone}</span>
                                        </div>
                                        {form.patient === p.label && <Check className="ml-auto h-4 w-4 text-slate-400" />}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="border-t px-3 py-2">
                              <Button
                                type="button"
                                variant="secondary"
                                className="w-full"
                                onClick={() => {
                                  setPatientDropdownOpen(false);
                                  setShowCreatePatient(true);
                                }}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Crear nuevo paciente
                              </Button>
                            </div>
                          </div>
                        )}
                     </div>
                     
                     {/* Manual Phone Override */}
                     <div className="relative space-y-1">
                        <div className="relative">
                            <Input 
                              value={form.phone}
                              onChange={(e) => {
                                handleChange("phone", e.target.value);
                                if (phoneError) setPhoneError(null);
                              }}
                              onBlur={() => {
                                if (!form.phone) return;
                                const { isValid, formatted, error } = validateAndFormatPhone(form.phone);
                                if (!isValid) {
                                  setPhoneError(error || "Número inválido");
                                } else if (formatted) {
                                  handleChange("phone", formatted);
                                }
                              }}
                              placeholder="+54 9 11..." 
                              className={cn("pl-8 text-sm", phoneError ? "border-red-500 ring-red-500" : "")}
                            />
                            <span className="absolute left-2.5 top-2.5 text-slate-400">
                               <Info className="h-4 w-4" />
                            </span>
                        </div>
                        {phoneError && <p className="text-xs text-red-500 font-medium ml-1">{phoneError}</p>}
                     </div>
                  </div>

                  {services.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700">Tratamiento</label>
                        {selectedService && (
                          <span className="text-xs text-slate-500">{formatServicePrice(selectedService)}</span>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {services.map((service) => (
                          <button
                            type="button"
                            key={service.id}
                            onClick={() => handleSelectServiceCard(service)}
                            className={cn(
                              "rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5",
                              form.serviceId === service.id
                                ? "border-brand-500 ring-2 ring-brand-200"
                                : "border-slate-200"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-base font-semibold text-slate-900">{service.name}</p>
                              <span className="text-sm font-medium text-slate-600">
                                {formatServicePrice(service)}
                              </span>
                            </div>
                            {service.description && (
                              <p className="mt-2 text-sm text-slate-500 line-clamp-2">{service.description}</p>
                            )}
                            <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">
                              {service.duration_minutes} minutos
                            </p>
                          </button>
                        ))}
                        {services.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                            Agregá servicios en Configuración para mostrarlos acá.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {providers.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700">Profesional</label>
                        {selectedProvider && (
                          <span className="text-xs text-slate-500">
                            {selectedProvider.default_location_id ? "Ubicación sugerida" : "Libre"}
                          </span>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {filteredProviders.map((provider) => (
                          <button
                            type="button"
                            key={provider.id}
                            onClick={() => handleSelectProviderCard(provider)}
                            className={cn(
                              "rounded-2xl border bg-white p-4 text-left shadow-sm transition",
                              form.providerId === provider.id
                                ? "border-brand-500 ring-2 ring-brand-200"
                                : "border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 flex-shrink-0">
                                {provider.avatar_url ? (
                                  <Image 
                                    src={provider.avatar_url} 
                                    alt={provider.full_name} 
                                    width={40}
                                    height={40}
                                    unoptimized
                                    className="h-full w-full rounded-full object-cover shadow-sm border border-slate-100 bg-slate-50"
                                  />
                                ) : (
                                  <div
                                    className="flex h-full w-full items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
                                    style={{ background: provider.color ?? "#0ea5e9" }}
                                  >
                                    {provider.full_name
                                      .split(" ")
                                      .map((chunk) => chunk[0])
                                      .slice(0, 2)
                                      .join("")}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{provider.full_name}</p>
                                <p className="text-xs text-slate-500">
                                  {provider.default_location_id
                                    ? locations.find((loc) => loc.id === provider.default_location_id)?.name ?? ""
                                    : "Cualquier sede"}
                                </p>
                              </div>
                            </div>
                            {provider.bio && (
                              <p className="mt-2 text-xs text-slate-500 line-clamp-2">{provider.bio}</p>
                            )}
                          </button>
                        ))}
                        {filteredProviders.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                            No hay profesionales activos para esta sede.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Duración (min)</label>
                        <Input 
                           type="number"
                           min={5}
                           step={5}
                           value={form.duration}
                           onChange={(e) => handleChange("duration", Number(e.target.value))}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Nombre del Servicio</label>
                         <Input 
                           value={form.service} 
                           placeholder="Ej. Consulta General"
                           onChange={(e) => handleChange("service", e.target.value)}
                           disabled={!!form.serviceId} // Disable name edit if linked to strictly defined service? Or allow edit? 
                                                       // Better allow edit but it might confuse if it's "Botox" but named "Fillers". 
                                                       // Let's keep it editable or handling it smarter.
                                                       // Actually, if I pick a card, I usually want that name.
                         />
                     </div>
                  </div>
                  {form.serviceId && (
                     <div className="flex items-center justify-between rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-700">
                        <span>Servicio vinculado: <strong>{services.find(s => s.id === form.serviceId)?.name}</strong></span>
                        <button 
                           type="button" 
                           onClick={() => setForm(prev => ({ ...prev, serviceId: undefined, service: "", duration: 30 }))}
                           className="hover:underline"
                        >
                           Desvincular
                        </button>
                     </div>
                  )}

                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-700">Consultorio</label>
                     <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!hasLocations}>
                        {!hasLocations && <option value="">Sin consultorios disponibles</option>}
                        {locations.map((loc) => (
                           <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                     </Select>
                     {!hasLocations && (
                        <p className="text-xs text-red-500">
                           No tenés permisos para ver consultorios o no hay ninguno creado. 
                           <br/> <a href="/api/repair" target="_blank" className="underline">Intentar reparar permisos</a>.
                        </p>
                     )}
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-700">Notas</label>
                     <textarea 
                        className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Detalles adicionales..."
                        value={form.notes}
                        onChange={(e) => handleChange("notes", e.target.value)}
                     />
                  </div>
                </div>
             </div>

             {/* Right Column: Scheduler */}
             <div className="flex-1 p-4 md:p-6 bg-slate-50/30 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                   <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                     <CalendarIcon className="h-4 w-4" /> Fecha
                   </h4>
                   <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-sm self-center sm:self-start w-full flex justify-center">
                      <Calendar
                         mode="single"
                         locale={es}
                         selected={form.date}
                         onSelect={(d) => d && handleChange("date", d)}
                         required
                         disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                         initialFocus
                         className="p-3 pointer-events-auto"
                      />
                   </div>
                </div>

                <div className="flex flex-col gap-3 min-h-[200px]">
                   <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                     <Clock className="h-4 w-4" /> Horarios Disponibles
                     {loadingSlots && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                   </h4>

                   {!form.date ? (
                      <div className="flex flex-col items-center justify-center flex-1 border-2 border-dashed border-slate-200 rounded-lg p-6 bg-slate-50/50">
                         <CalendarIcon className="h-8 w-8 text-slate-300 mb-2" />
                         <p className="text-sm text-slate-400 text-center mb-4">Seleccione un día para ver horarios.</p>
                         
                         <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleSuggest}
                            disabled={lookingForSuggestions || !locationId}
                            className="gap-2 text-brand-600 border-brand-200 hover:bg-brand-50"
                        >
                            {lookingForSuggestions ? <Loader2 className="h-3 w-3 animate-spin"/> : <Sparkles className="h-3 w-3" />}
                            Buscar próximo turno libre
                         </Button>

                         {suggestions.length > 0 && (
                            <div className="mt-4 w-full space-y-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Sugerencias:</p>
                                {suggestions.map((s) => (
                                    <div key={s.date} className="text-left bg-white border border-slate-200 rounded-md p-2 shadow-sm">
                                        <p className="text-xs font-medium text-slate-700 mb-1">
                                            {format(parse(s.date, "yyyy-MM-dd", new Date()), "EEEE d 'de' MMMM", { locale: es })}
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {s.slots.map(slot => (
                                                <button
                                                    key={slot}
                                                    type="button"
                                                    onClick={() => {
                                                        handleChange("date", parse(s.date, "yyyy-MM-dd", new Date()));
                                                        handleChange("time", slot);
                                                    }}
                                                    className="px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors"
                                                >
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                         )}
                      </div>
                   ) : availableSlots.length === 0 && !loadingSlots ? (
                      <div className="flex flex-col items-center justify-center flex-1 border border-slate-200 rounded-lg p-6 bg-white">
                         <p className="text-sm text-slate-600 font-medium">No hay turnos disponibles.</p>
                         <p className="text-xs text-slate-400 mt-1">Pruebe cambiar la duración o el día.</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 content-start">
                         {availableSlots.map((time) => (
                            <button
                               type="button"
                               key={time}
                               onClick={() => handleChange("time", time)}
                               className={cn(
                                 "text-sm font-medium py-2 px-1 rounded-md border transition-all relative",
                                 form.time === time 
                                   ? "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105 z-10" 
                                   : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                               )}
                            >
                               {time}
                            </button>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          </form>

          <div className="p-4 border-t bg-slate-50 flex justify-between items-center gap-2">
             <div>
                {isEdit && appointment?.status !== 'canceled' && (
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        onClick={handleCancelAppointment}
                        disabled={loading}
                        className="bg-red-100 text-red-700 hover:bg-red-200 border-none shadow-none"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Anular Turno
                    </Button>
                )}
             </div>
             <div className="flex gap-2">
                {isEdit && appointment?.status !== "canceled" && appointment?.status !== "completed" && (
                    <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        onClick={() => setAttendOpen(true)}
                    >
                        <Stethoscope className="h-4 w-4" />
                        Atender
                    </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
                <Button type="submit" onClick={handleSubmit} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEdit ? "Guardar Cambios" : "Confirmar Turno"}
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {appointment && (
          <ConsultationModal 
            open={attendOpen} 
            onOpenChange={setAttendOpen}
            appointmentId={appointment.id}
            patientName={appointment.patient}
            serviceName={appointment.service ?? "Consulta"}
            onSuccess={() => {
                setOpen(false); // Close parent
                router.refresh();
            }}
          />
      )}
      
      {showCreatePatient && (
         <CreatePatientDialog 
            onClose={() => setShowCreatePatient(false)} 
            onSuccess={(p) => {
               if(p) {
              handlePatientSelect({ id: p.id, label: p.full_name, phone: p.phone_e164 });
               }
               setShowCreatePatient(false);
            }} 
         />
      )}
    </>
  );
}
