"use client";

import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppointmentStatus } from "@/lib/constants";
import { ChevronLeft, ChevronRight, Plus, Clock, User, Calendar as CalendarIcon } from "lucide-react";

type Appointment = {
  id: string;
  start: Date;
  durationMinutes: number;
  patient: string;
  status: AppointmentStatus;
  phone: string;
  locationId?: string;
  service?: string;
  notes?: string;
};

const STATUS_LABEL: Record<AppointmentStatus, { label: string; color: Parameters<typeof Badge>[0]["color"] }> = {
  pending: { label: "Pendiente", color: "pending" },
  confirmed: { label: "Confirmado", color: "confirmed" },
  reschedule_requested: { label: "Reprogramar", color: "risk" },
  canceled: { label: "Cancelado", color: "canceled" },
  completed: { label: "Atendido", color: "attended" },
  no_show: { label: "No show", color: "noshow" },
};

type WeeklyCalendarProps = {
  appointments: Appointment[];
  onCreate?: () => void;
  onSelect?: (appt: Appointment) => void;
};

export function WeeklyCalendar({ appointments, onCreate, onSelect }: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => {
    const start = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
    return Array.from({ length: 7 }, (_, idx) => addDays(start, idx));
  }, [weekOffset]);

  const grouped = useMemo(() => {
    return days.map((day) => ({
      day,
      items: appointments.filter((appt) =>
        appt.start.toDateString() === day.toDateString(),
      ),
    }));
  }, [appointments, days]);

  return (
    <Card className="h-full border-none shadow-none sm:border sm:shadow-sm">
      <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="capitalize">
            {format(grouped[0]?.day ?? new Date(), "MMMM yyyy", { locale: es })}
          </CardTitle>
          <CardDescription>
            Semana del {format(grouped[0]?.day ?? new Date(), "d", { locale: es })} al {format(grouped[6]?.day ?? new Date(), "d", { locale: es })}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-md p-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((x) => x - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-medium" onClick={() => setWeekOffset(0)}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((x) => x + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {onCreate && (
            <Button onClick={onCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Turno
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 sm:p-6 pt-0">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
          {grouped.map(({ day, items }) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "flex flex-col min-h-[300px] rounded-lg border bg-slate-50/50",
                  isToday ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
                )}
              >
                {/* Header dia */}
                <div className={cn(
                  "p-3 text-center border-b",
                  isToday ? "bg-blue-100/50 border-blue-200" : "bg-white border-slate-200 rounded-t-lg"
                )}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {format(day, "EEEE", { locale: es })}
                  </p>
                  <p className={cn(
                    "text-lg font-bold mt-0.5",
                    isToday ? "text-blue-600" : "text-slate-900"
                  )}>
                    {format(day, "d", { locale: es })}
                  </p>
                </div>

                {/* Lista de turnos */}
                <div className="flex-1 p-2 space-y-2">
                  {items.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[100px]">
                      <CalendarIcon className="h-8 w-8 opacity-20" />
                    </div>
                  )}
                  {items.sort((a,b) => a.start.getTime() - b.start.getTime()).map((appt) => (
                    <div
                      key={appt.id}
                      className="group relative flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md hover:border-slate-300 cursor-pointer"
                      onClick={() => onSelect?.(appt)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && onSelect?.(appt)}
                    >
                      <div className="flex items-center justify-between">
                        <Badge label={STATUS_LABEL[appt.status].label} color={STATUS_LABEL[appt.status].color} />
                        <span className="text-xs text-slate-400 font-mono">
                          {format(appt.start, "HH:mm")}
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-slate-900 truncate" title={appt.patient}>
                          {appt.patient}
                        </p>
                        {appt.service && (
                          <p className="text-xs text-slate-500 truncate">{appt.service}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 pt-2 border-t border-slate-50">
                        <Clock className="h-3 w-3" />
                        <span>{appt.durationMinutes} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
