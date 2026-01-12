"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AppointmentStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

type HistoryAppointment = {
  id: string;
  start: string; // ISO
  patient: string;
  status: AppointmentStatus;
  service: string;
  provider: string; // Name
  location: string; // Name
};

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmed: {
    label: "Confirmado",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  pending: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  reschedule_requested: {
    label: "Solicitó cambio",
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
  canceled: {
    label: "Cancelado",
    className: "bg-gray-100 text-gray-500 line-through hover:bg-gray-100",
  },
  completed: {
    label: "Completado",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  no_show: {
    label: "Ausente",
    className: "bg-slate-200 text-slate-700 hover:bg-slate-200",
  },
};

export function HistoryList({ appointments }: { appointments: HistoryAppointment[] }) {
  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Hora</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Servicio</TableHead>
            <TableHead>Profesional</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No hay historial de turnos.
              </TableCell>
            </TableRow>
          ) : (
            appointments.map((appt) => {
              const date = new Date(appt.start);
              const config = statusConfig[appt.status] ?? { label: appt.status, className: "" };
              
              return (
                <TableRow key={appt.id}>
                  <TableCell className="font-medium">
                    {format(date, "d 'de' MMMM, yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>
                    {format(date, "HH:mm")}
                  </TableCell>
                  <TableCell>{appt.patient}</TableCell>
                  <TableCell>{appt.service || "-"}</TableCell>
                  <TableCell>{appt.provider || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={appt.status === 'confirmed' ? 'confirmed' : 'pending'} className={cn("font-normal border-0", config.className)}>
                      {config.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
