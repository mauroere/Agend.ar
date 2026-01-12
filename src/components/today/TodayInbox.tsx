"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, CalendarClock, Pencil, Check, X } from "lucide-react";
import { AppointmentStatus } from "@/lib/constants";
import { AppointmentModal } from "@/components/calendar/AppointmentModal";

// --- Types ---
type CalendarAppointment = {
  id: string;
  start: string; // ISO String from server
  durationMinutes: number;
  patient: string;
  status: AppointmentStatus;
  phone: string;
  locationId?: string;
  service?: string;
  serviceId?: string;
  providerId?: string;
  notes?: string;
};

// Type compatible with AppointmentModal
type ModalAppointmentData = Omit<CalendarAppointment, "start"> & { start: Date };

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

type TodayInboxProps = {
  appointments: CalendarAppointment[];
  locations: LocationOption[];
  services: ServiceOption[];
  providers: ProviderOption[];
};

export function TodayInbox({ appointments, locations, services, providers }: TodayInboxProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ModalAppointmentData | undefined>(undefined);

  // Stats Logic
  const activeAppointments = appointments.filter(a => a.status !== "canceled" && a.status !== "no_show");
  
  const confirmedCount = activeAppointments.filter(a => a.status === "confirmed").length;
  const pendingCount = activeAppointments.filter(a => a.status === "pending").length;
  const riskCount = activeAppointments.filter(a => a.status === "reschedule_requested").length; // "En riesgo" usually means reschedule requested

  // Helper to get status badge style
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "confirmed":
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Confirmado</span>;
      case "pending":
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Pendiente</span>;
      case "reschedule_requested":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Solicitó cambio</span>;
      case "canceled":
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 line-through">Cancelado</span>;
      case "completed":
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">Completado</span>;
      case "no_show":
        return <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">Ausente</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{status}</span>;
    }
  };

  // Actions
  const handleEdit = (appt: CalendarAppointment) => {
    setSelectedAppointment({
        ...appt,
        start: new Date(appt.start)
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedAppointment(undefined);
    setIsModalOpen(true);
  };

  const handleConfirm = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}/confirm`, { method: "POST" });
      if (!res.ok) throw new Error("Error al confirmar");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("No se pudo confirmar el turno. Intente nuevamente.");
    } finally {
      setLoadingId(null);
    }
  };

  // Only show active appointments in the main list, or sort them?
  // User wants to see the "Day", so presumably all of them, maybe sorted by time.
  // The backend already sorts by start_at.
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedCount}</div>
            <p className="text-xs text-muted-foreground">Listos para hoy</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Requieren confirmación</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cambios</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskCount}</div>
            <p className="text-xs text-muted-foreground">Solicitudes de reprogramación</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Agenda List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Agenda del Día</CardTitle>
            <CardDescription>
               {appointments.length} turnos programados para hoy
            </CardDescription>
          </div>
          <Button onClick={handleCreate} size="sm">
            + Nuevo Turno Hoy
          </Button>
        </CardHeader>
        
        <CardContent>
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <CalendarClock className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Agenda Libre</h3>
              <p>No hay turnos registrados para hoy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div 
                  key={appt.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors gap-3"
                >
                  {/* Time & Info */}
                  <div className="flex items-start sm:items-center gap-4 flex-1 cursor-pointer" onClick={() => handleEdit(appt)}>
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-100 shrink-0">
                      <span className="text-sm">{format(new Date(appt.start), "HH:mm")}</span>
                      {/* <span className="text-[10px] text-blue-400 font-normal">min</span> */}
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-slate-900 leading-tight mb-1">{appt.patient}</h4>
                      <div className="flex flex-wrap gap-2 items-center">
                        {getStatusBadge(appt.status)}
                        {appt.service && (
                          <span className="text-xs text-slate-500 border-l pl-2 border-slate-300">
                            {appt.service}
                          </span>
                        )}
                        {appt.notes && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 rounded">
                                Nota
                            </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Quick Confirm */}
                    {appt.status === "pending" && (
                        <Button 
                            variant="primary" 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                            onClick={() => handleConfirm(appt.id)}
                            disabled={loadingId === appt.id}
                        >
                            {loadingId === appt.id ? "..." : <><Check className="w-3.5 h-3.5 mr-1" /> Confirmar</>}
                        </Button>
                    )}
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-slate-700"
                        onClick={() => handleEdit(appt)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Modal */}
      <AppointmentModal
        locations={locations}
        services={services}
        providers={providers}
        open={isModalOpen}
        onOpenChange={(v) => {
            setIsModalOpen(v);
            if (!v) setSelectedAppointment(undefined);
        }}
        appointment={selectedAppointment}
        defaultDate={new Date()} // Defaults to today when creating new
      />
    </div>
  );
}
