"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

type AppointmentProps = {
  id: string;
  start_at: string;
  service_name: string;
  status: string;
  location: { name: string; address: string | null } | null;
};

// Appointment Card Component
export function AppointmentCard({ appt, isPast }: { appt: AppointmentProps, isPast?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Check 24h Policy
  const now = new Date();
  const startAt = new Date(appt.start_at);
  const diffInHours = (startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isWithin24Hours = diffInHours < 24;
  const isCanceled = appt.status === 'canceled';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-AR", { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
      const map: Record<string, any> = {
          'confirmed': { label: 'Confirmado', variant: 'default' as const, className: 'bg-green-600' },
          'pending': { label: 'Pendiente', variant: 'outline' as const, className: 'text-orange-600 border-orange-200 bg-orange-50' },
          'canceled': { label: 'Cancelado', variant: 'destructive' as const, className: '' },
          'completed': { label: 'Completado', variant: 'secondary' as const, className: 'bg-slate-200' },
      };
      const conf = map[status] || { label: status, variant: 'outline' };
      return <Badge variant={conf.variant} className={conf.className || ""}>{conf.label}</Badge>;
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
        const res = await fetch(`/api/portal/appointments/${appt.id}/cancel`, { method: "POST" });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Error al cancelar");
        
        toast({ title: "Turno cancelado", description: "El turno ha sido cancelado correctamente." });
        router.refresh();
    } catch (e) {
        toast({ 
            title: "No se pudo cancelar", 
            description: e instanceof Error ? e.message : "Intente nuevamente más tarde.", 
            variant: "destructive" 
        });
    } finally {
        setLoading(false);
    }
  };

  const handleReschedule = async () => {
     // Logic: Cancel first, then redirect to booking
     setLoading(true);
    try {
        const res = await fetch(`/api/portal/appointments/${appt.id}/cancel`, { method: "POST" });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Error al procesar la reprogramación");
        
        toast({ title: "Turno anterior cancelado", description: "Seleccioná tu nuevo horario." });
        // Redirect to booking page (root of tenant)
        router.push(`../`); 
    } catch (e) {
        toast({ 
            title: "Error", 
            description: e instanceof Error ? e.message : "No se pudo iniciar la reprogramación.", 
            variant: "destructive" 
        });
        setLoading(false);
    }
  };

  const isCancelable = !isPast && !isCanceled && appt.status !== 'completed' && appt.status !== 'no_show' && !isWithin24Hours;

  return (
      <Card className="overflow-hidden border-l-4 border-l-indigo-500 shadow-md transition-all hover:shadow-lg">
          <CardContent className="p-5">
             <div className="flex justify-between items-start mb-3">
                 <div>
                     <p className="font-semibold text-lg text-slate-900">{appt.service_name || "Consulta General"}</p>
                     <p className="text-indigo-600 font-medium capitalize first-letter:uppercase flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(appt.start_at)}
                     </p>
                 </div>
                 {getStatusBadge(appt.status)}
             </div>
             
             <div className="flex items-start gap-2 text-sm text-slate-600 mt-4 bg-slate-50 p-3 rounded-lg">
                 <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                 <div>
                     <p className="font-medium">{appt.location?.name}</p>
                     {appt.location?.address && <p className="text-xs text-slate-500">{appt.location.address}</p>}
                 </div>
             </div>

             {/* Policy Warning */}
             {!isPast && !isCanceled && isWithin24Hours && (
                 <div className="mt-4 p-3 bg-red-50 text-red-800 text-sm rounded-lg flex items-start gap-2 border border-red-100">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                        Ya no es posible cancelar ni reprogramar este turno (Política de 24hs). 
                        Contactate con el consultorio si es una urgencia.
                    </p>
                 </div>
             )}

             <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100/50">
                 {isCancelable ? (
                     <>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" className="text-slate-500 hover:text-red-600 hover:bg-red-50" disabled={loading}>
                                    Cancelar turno
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>¿Cancelar Turno?</DialogTitle>
                                    <DialogDescription>
                                        Esta acción liberará tu horario. Si pagaste seña, consultá las condiciones de reembolso.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="destructive" onClick={handleCancel} disabled={loading}>
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar cancelación"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50" disabled={loading}>
                                    Reprogramar
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>¿Reprogramar Turno?</DialogTitle>
                                    <DialogDescription>
                                        Para cambiar el horario, primero debemos cancelar tu turno actual. Luego te llevaremos a la agenda para que elijas uno nuevo.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button onClick={handleReschedule} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, reprogramar"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                     </>
                 ) : (
                    <>
                        {/* If cancelled or past, maybe show nothing or Receipt button */}
                        {!isCanceled && !isPast && (
                             <Button variant="ghost" disabled className="text-slate-400">
                                No modificable
                            </Button>
                        )}
                    </>
                 )}
             </div>
          </CardContent>
      </Card>
  );
}
