"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

type AppointmentProps = {
  id: string;
  start_at: string;
  service_name: string;
  status: string;
  location: { name: string; address: string | null } | null;
};

export function AppointmentCard({ appt }: { appt: AppointmentProps }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
        if (!res.ok) throw new Error("Error al cancelar");
        
        toast({ title: "Turno cancelado", description: "El turno ha sido cancelado correctamente." });
        router.refresh();
    } catch (e) {
        toast({ title: "Error", description: "No se pudo cancelar el turno.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const isCancelable = appt.status !== 'canceled' && appt.status !== 'completed' && appt.status !== 'no_show';

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

             {isCancelable && (
                 <div className="mt-4 flex justify-end">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={loading}>
                                {loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                Cancelar Turno
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción cancelará tu turno para el {formatDate(appt.start_at)}.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Volver</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
                                    Sí, cancelar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                 </div>
             )}
          </CardContent>
      </Card>
  );
}
