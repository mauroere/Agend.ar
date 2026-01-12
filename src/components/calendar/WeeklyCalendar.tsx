"use client";

import { addDays, format, isSameDay, startOfWeek, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AppointmentStatus } from "@/lib/constants";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";

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

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendiente", color: "text-amber-600", bg: "bg-amber-500" },
  confirmed: { label: "Confirmado", color: "text-emerald-600", bg: "bg-emerald-500" },
  reschedule_requested: { label: "Reprogramar", color: "text-orange-600", bg: "bg-orange-500" },
  canceled: { label: "Cancelado", color: "text-rose-600", bg: "bg-rose-500" },
  completed: { label: "Atendido", color: "text-blue-600", bg: "bg-blue-500" },
  no_show: { label: "Ausente", color: "text-slate-600", bg: "bg-slate-500" },
};

type WeeklyCalendarProps = {
  appointments: Appointment[];
  onCreate?: () => void;
  onSelect?: (appt: Appointment) => void;
  isLoading?: boolean;
};

// Constants for the Time Grid
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const PIXELS_PER_HOUR = 120; // Enough space for 30min slots
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

type ViewMode = 'day' | 'week' | 'month';

export function WeeklyCalendar({ appointments, onCreate, onSelect, isLoading }: WeeklyCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [date, setDate] = useState(new Date());

  const days = useMemo(() => {
    switch (viewMode) {
        case 'day':
            return [date];
        case 'week':
            const start = startOfWeek(date, { weekStartsOn: 1 });
            return Array.from({ length: 7 }, (_, idx) => addDays(start, idx));
        case 'month':
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
            const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
            return eachDayOfInterval({ start: startDate, end: endDate });
        default:
            return [];
    }
  }, [viewMode, date]);

  const grouped = useMemo(() => {
    return days.map((day) => ({
      day,
      items: appointments.filter((appt) => isSameDay(appt.start, day)),
    }));
  }, [appointments, days]);

  const currentMonthLabel = format(date, "MMMM yyyy", { locale: es });

  const navigate = (direction: 'prev' | 'next') => {
      const amount = direction === 'prev' ? -1 : 1;
      if (viewMode === 'day') setDate(d => addDays(d, amount));
      if (viewMode === 'week') setDate(d => addDays(d, amount * 7));
      if (viewMode === 'month') {
          // Move to 1st of next/prev month to avoid end-of-month skipping issues
          const newDate = new Date(date);
          newDate.setMonth(newDate.getMonth() + amount);
          setDate(newDate);
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4 flex-none">
        <div>
          <h2 className="text-2xl font-bold capitalize text-slate-800 tracking-tight">
            {currentMonthLabel}
          </h2>
           {viewMode === 'week' && (
              <p className="text-sm text-slate-500">
                Semana del {format(days[0], "d")} al {format(days[6], "d", { locale: es })}
              </p>
           )}
           {viewMode === 'day' && (
               <p className="text-sm text-slate-500 capitalize">
                {format(date, "EEEE d", { locale: es })}
               </p>
           )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
             <div className="w-[110px]">
                {/* Selector de Vistas */}
                <Select 
                    value={viewMode} 
                    onChange={(e) => setViewMode(e.target.value as ViewMode)}
                    className="h-9 py-1"
                >
                    <option value="day">Día</option>
                    <option value="week">Semana</option>
                    <option value="month">Mes</option>
                </Select>
             </div>

            <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </Button>
            <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                    "h-8 px-3 text-xs font-semibold hover:bg-slate-100", 
                    isSameDay(date, new Date()) ? "text-blue-600" : "text-slate-600"
                )}
                onClick={() => setDate(new Date())}
            >
              Hoy
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </Button>
          </div>
          {onCreate && (
            <Button onClick={onCreate} size="sm" className="ml-auto sm:ml-0 shadow-sm bg-blue-600 hover:bg-blue-700 text-white border-none">
              <Plus className="mr-1.5 h-4 w-4" /> 
              Nuevo
            </Button>
          )}
        </div>
      </div>
      
      {/* Calendar Grid Container */}
      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5 flex flex-col">
        {viewMode === 'month' ? (
           /* MONTH VIEW */
           <div className="flex flex-col h-full overflow-auto bg-white">
            <div className="min-w-[800px] flex flex-col h-full min-h-[500px]">
              {/* Header Days */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50 flex-none sticky top-0 z-10">
                   {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                       <div key={d} className="py-2 text-center text-xs font-semibold uppercase text-slate-400">
                           {d.substring(0,3)}
                       </div>
                   ))}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6 divide-x divide-y divide-slate-100 bg-white">
                   {grouped.map(({ day, items }) => {
                       const isToday = isSameDay(day, new Date());
                       const isCurrentMonth = day.getMonth() === date.getMonth();
                       return (
                           <div 
                               key={day.toISOString()} 
                               className={cn(
                                   "p-1 flex flex-col min-h-[80px] hover:bg-slate-50/50 transition-colors",
                                   !isCurrentMonth && "bg-slate-50/30 text-slate-400"
                               )}
                               onClick={() => {
                                   setDate(day);
                                   setViewMode('day');
                               }}
                            >
                               <div className="flex items-center justify-center h-6 w-6 ml-auto mb-1">
                                    <span className={cn(
                                        "text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center",
                                        isToday ? "bg-blue-600 text-white" : "text-slate-700"
                                    )}>
                                        {format(day, "d")}
                                    </span>
                               </div>
                               <div className="flex-1 space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                                   {items.slice(0, 4).map(appt => (
                                       <div key={appt.id} className={cn("px-1.5 py-0.5 rounded text-[10px] truncate font-medium flex items-center gap-1", STATUS_CONFIG[appt.status].bg.replace('bg-', 'bg-opacity-20 bg-').replace('bg-opacity-20', 'bg-opacity-25 text-slate-700'))} onClick={(e) => { e.stopPropagation(); onSelect?.(appt); }}>
                                           <div className={cn("w-1 h-1 rounded-full shrink-0", STATUS_CONFIG[appt.status].bg)}></div>
                                           {appt.patient}
                                       </div>
                                   ))}
                                   {items.length > 4 && (
                                       <div className="text-[10px] text-slate-400 pl-1">
                                           + {items.length - 4} más
                                       </div>
                                   )}
                               </div>
                           </div>
                       )
                   })}
              </div>
            </div>
           </div>
        ) : (
            /* TIME GRID VIEW (DAY/WEEK) */
           <div className="flex-1 overflow-auto bg-white relative flex flex-col">
            <div className="min-w-fit flex flex-col h-full">
            {/* Days Header */}
            <div className="sticky top-0 z-40 bg-white border-b border-slate-200 divide-x divide-slate-100 flex flex-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"> 
                <div className="w-14 flex-none border-r border-slate-100 bg-white sticky left-0 z-50 shadow-[1px_0_0_rgba(0,0,0,0.05)]" /> 
                <div className={cn(
                    "grid flex-1 divide-x divide-slate-100",
                    viewMode === 'week' ? "grid-cols-7 min-w-[800px]" : "grid-cols-1 w-full"
                )}>
                {days.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                        <div 
                        key={day.toISOString()} 
                        className={cn(
                            "p-3 text-center transition-colors duration-200",
                            isToday ? "bg-blue-50/50" : "bg-transparent"
                        )}
                        >
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-wider block mb-1",
                                isToday ? "text-blue-600" : "text-slate-400"
                            )}>
                                {format(day, "EEE", { locale: es })}
                            </span>
                            <div className={cn(
                                "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all",
                                isToday ? "bg-blue-600 text-white shadow-md" : "text-slate-700"
                            )}>
                                {format(day, "d")}
                            </div>
                        </div>
                    );
                })}
              </div>
            </div>

            {/* Scrollable Time Grid Body */}
            <div className="min-h-0 flex-1 relative flex">
                {/* Time Labels Column */}
                <div className="w-14 flex-none border-r border-slate-200 bg-white sticky left-0 z-30 select-none shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                    <div style={{ height: HOURS.length * PIXELS_PER_HOUR }} className="relative">
                    {HOURS.map((hour) => (
                        <div 
                            key={hour} 
                            className="absolute text-right w-full pr-2 text-xs font-medium text-slate-400 -mt-2.5"
                            style={{ top: (hour - START_HOUR) * PIXELS_PER_HOUR }}
                        >
                            {hour}:00
                        </div>
                    ))}
                    </div>
                </div>

                {/* Days Columns */}
                <div className={cn(
                    "grid flex-1 divide-x divide-slate-100 relative",
                    viewMode === 'week' ? "grid-cols-7 min-w-[800px]" : "grid-cols-1 w-full"
                )}>
                    {/* Background Grid Lines (Horizontal) */}
                    <div className="absolute inset-0 z-0 pointer-events-none w-full" style={{ height: HOURS.length * PIXELS_PER_HOUR }}>
                        {HOURS.map((hour) => (
                        <div 
                            key={`line-${hour}`} 
                            className="absolute w-full border-t border-slate-100 border-dashed"
                            style={{ top: (hour - START_HOUR) * PIXELS_PER_HOUR }}
                        />
                    ))}
                    </div>

                    {/* Day Columns content */}
                    {grouped.map(({ day, items }) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                        <div key={day.toISOString()} className={cn("relative h-full", isToday ? "bg-blue-50/10" : "")}>
                            {items.map((appt) => {
                            const start = appt.start;
                            const startMinutes = start.getHours() * 60 + start.getMinutes();
                            const offsetMinutes = startMinutes - (START_HOUR * 60);
                            
                            // Calculate top position
                            const top = offsetMinutes * PIXELS_PER_MINUTE;
                            // Calculate height
                            const height = appt.durationMinutes * PIXELS_PER_MINUTE;

                            const statusConfig = STATUS_CONFIG[appt.status];

                            return (
                                <div
                                key={appt.id}
                                className={cn(
                                    "absolute left-0.5 right-1.5 rounded-md border text-xs cursor-pointer shadow-sm transition-all hover:shadow-md z-10 overflow-hidden flex flex-col pl-1.5 py-1",
                                    "border-l-4", // Thick colored left border
                                    statusConfig.bg.replace("bg-", "bg-opacity-10 bg-").replace("bg-opacity-10", "bg-opacity-15"), // Light bg
                                    statusConfig.bg.replace("bg-", "border-l-") // Colored border
                                )}
                                style={{ top, height: Math.max(height, 24) }} // Min height 24px
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect?.(appt);
                                }}
                                >  
                                    {/* Title / Patient */}
                                    <div className="font-semibold text-slate-900 leading-tight truncate">
                                    {appt.patient}
                                    </div>
                                    {/* Time + Status */}
                                    <div className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1">
                                        {format(start, "HH:mm")} - {format(addDays(start, 0), "HH:mm")} 
                                        {height > 40 && (
                                        <span>• {appt.service ?? "Consulta"}</span>
                                        )}
                                    </div>
                                </div>
                            )
                            })}
                        </div>
                    );
                    })}
                </div>
            </div>
            </div>
           </div>
        )}
      </div>
    </div>
  );
}
