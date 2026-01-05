"use client";

import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentStatus } from "@/lib/constants";

type Appointment = {
  id: string;
  start: Date;
  durationMinutes: number;
  patient: string;
  status: AppointmentStatus;
};

const STATUS_LABEL: Record<AppointmentStatus, { label: string; color: Parameters<typeof Badge>[0]["color"] }> = {
  pending: { label: "Pendiente", color: "pending" },
  confirmed: { label: "Confirmado", color: "confirmed" },
  reschedule_requested: { label: "Reprogramar", color: "risk" },
  canceled: { label: "Cancelado", color: "canceled" },
  completed: { label: "Atendido", color: "attended" },
  no_show: { label: "No show", color: "noshow" },
};

export function WeeklyCalendar({ appointments }: { appointments: Appointment[] }) {
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
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500">Semana</p>
          <h2 className="text-2xl font-semibold">
            {format(grouped[0]?.day ?? new Date(), "d MMMM", { locale: es })} ·
            {" "}
            {format(grouped[6]?.day ?? new Date(), "d MMMM", { locale: es })}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setWeekOffset((x) => x - 1)}>
            ◀ Semana previa
          </Button>
          <Button variant="outline" onClick={() => setWeekOffset(0)}>
            Hoy
          </Button>
          <Button variant="outline" onClick={() => setWeekOffset((x) => x + 1)}>
            Semana siguiente ▶
          </Button>
          <Button>+ Turno</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-7">
        {grouped.map(({ day, items }) => (
          <div key={day.toISOString()} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-sm uppercase tracking-wide text-slate-400">
              {format(day, "EEEE", { locale: es })}
            </p>
            <p className="text-2xl font-semibold">{format(day, "d MMM", { locale: es })}</p>
            <div className="mt-3 space-y-3">
              {items.length === 0 && <p className="text-sm text-slate-400">Sin turnos</p>}
              {items.map((appt) => (
                <article
                  key={appt.id}
                  className={cn(
                    "rounded-xl border border-slate-100 bg-slate-900/5 px-3 py-2",
                  )}
                >
                  <p className="text-sm font-semibold">
                    {format(appt.start, "HH:mm")} · {appt.patient}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{appt.durationMinutes} min</span>
                    <Badge
                      label={STATUS_LABEL[appt.status].label}
                      color={STATUS_LABEL[appt.status].color}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
