"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, CalendarCheck, CalendarX, AlertCircle, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type AnalyticsData = {
  metrics: {
    total_appointments: number;
    confirmed_appointments: number;
    canceled_appointments: number;
    no_show_appointments: number;
    new_patients: number;
    estimated_revenue: number;
  };
  daily_series: Array<{
    date: string;
    count: number;
  }>;
};

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => {
        if (!res.ok) throw new Error("Error cargando reporte");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <div className="flex items-center gap-2 font-semibold">
           <AlertCircle className="h-5 w-5" /> Error
        </div>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, daily_series } = data;
  
  // Format Revenue (assuming minor units e.g. cents)
  const revenue = new Intl.NumberFormat("es-AR", { 
      style: "currency", 
      currency: "ARS",
      maximumFractionDigits: 0 
  }).format(metrics.estimated_revenue / 100);

  // Calculate Confirmation Rate
  const confirmRate = metrics.total_appointments > 0 
    ? Math.round((metrics.confirmed_appointments / metrics.total_appointments) * 100)
    : 0;

  // Max value for chart scaling
  const maxDaily = Math.max(...daily_series.map(d => d.count), 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
         <h2 className="text-2xl font-bold tracking-tight text-slate-900">Métricas del Mes</h2>
         <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {format(new Date(), "MMMM yyyy", { locale: es })}
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
           title="Turnos Totales" 
           value={metrics.total_appointments} 
           icon={TrendingUp}
           description={`${confirmRate}% Tasa de confirmación`}
        />
        <KpiCard 
           title="Ingresos Estimados" 
           value={revenue} 
           icon={DollarSign}
           description="Proyectado (confirmados)"
           highlight
        />
        <KpiCard 
           title="Nuevos Pacientes" 
           value={metrics.new_patients} 
           icon={Users}
           description="Registrados este mes"
        />
        <KpiCard 
           title="Cancelaciones" 
           value={metrics.canceled_appointments} 
           icon={CalendarX}
           description={`${metrics.no_show_appointments} No-Shows (Ausentes)`}
           alert={metrics.canceled_appointments > 0}
        />
      </div>

      {/* Main Chart Section */}
      <div className="grid gap-4 md:grid-cols-7">
         <Card className="col-span-4 lg:col-span-5">
            <CardHeader>
               <CardTitle>Demanda Diaria</CardTitle>
               <CardDescription>Cantidad de turnos por día durante este mes.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
               <div className="h-[250px] w-full flex items-end gap-1 sm:gap-2 pt-6">
                  {daily_series.map((day) => {
                      const heightPercent = (day.count / maxDaily) * 100;
                      return (
                        <div key={day.date} className="group relative flex-1 flex flex-col justify-end h-full">
                           <div 
                              className="w-full bg-indigo-100 group-hover:bg-indigo-300 transition-all rounded-t-sm relative min-h-[4px]"
                              style={{ height: `${heightPercent}%` }}
                           >
                              {/* Tooltip on hover */}
                              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                                 {day.count} turnos - {format(parseISO(day.date), "dd MMM", { locale: es })}
                                 <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                           </div>
                           {/* X Axis Label (show every 5 days roughly) */}
                           <div className="mt-2 text-[10px] text-center text-slate-400 font-medium truncate">
                              {/* Simple logic to avoid overcrowding labels */}
                              {parseInt(day.date.split('-')[2]) % 5 === 0 || day.date === daily_series[0].date || day.date === daily_series[daily_series.length-1].date
                                ? format(parseISO(day.date), "d") 
                                : ""}
                           </div>
                        </div>
                      )
                  })}
               </div>
            </CardContent>
         </Card>

         <Card className="col-span-3 lg:col-span-2">
            <CardHeader>
                <CardTitle>Eficiencia</CardTitle>
                <CardDescription>Estado de la agenda</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-600">Completados/Confirmados</span>
                        <span className="text-emerald-600 font-bold">{metrics.confirmed_appointments}</span>
                     </div>
                     <ProgressBar value={metrics.confirmed_appointments} total={metrics.total_appointments} color="bg-emerald-500" />
                  </div>

                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-600">Pendientes</span>
                        <span className="text-amber-600 font-bold">
                           {metrics.total_appointments - metrics.confirmed_appointments - metrics.canceled_appointments - metrics.no_show_appointments}
                        </span>
                     </div>
                     <ProgressBar 
                        value={metrics.total_appointments - metrics.confirmed_appointments - metrics.canceled_appointments - metrics.no_show_appointments} 
                        total={metrics.total_appointments} 
                        color="bg-amber-400" 
                     />
                  </div>

                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-600">Cancelados</span>
                        <span className="text-red-500 font-bold">{metrics.canceled_appointments}</span>
                     </div>
                     <ProgressBar value={metrics.canceled_appointments} total={metrics.total_appointments} color="bg-red-400" />
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                          <AlertCircle className="w-4 h-4 text-orange-400" />
                          <p>
                             Ausentismo: <strong className="text-slate-700">{Math.round((metrics.no_show_appointments / (metrics.total_appointments || 1)) * 100)}%</strong>
                             <br/><span className="text-xs">Pacientes que faltaron sin avisar.</span>
                          </p>
                      </div>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

    </div>
  );
}

function KpiCard({ title, value, icon: Icon, description, highlight, alert }: any) {
    return (
        <Card className={highlight ? "border-indigo-200 bg-indigo-50/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
                {title}
            </CardTitle>
            <Icon className={`h-4 w-4 ${highlight ? 'text-indigo-600' : 'text-slate-400'}`} />
            </CardHeader>
            <CardContent>
            <div className={`text-2xl font-bold ${highlight ? 'text-indigo-900' : 'text-slate-900'}`}>{value}</div>
            {description && (
                <p className={`text-xs ${alert ? 'text-red-500 font-medium' : 'text-slate-500'} mt-1`}>
                    {description}
                </p>
            )}
            </CardContent>
        </Card>
    )
}

function ProgressBar({ value, total, color }: { value: number, total: number, color: string }) {
    const percent = total > 0 ? (value / total) * 100 : 0;
    return (
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} />
        </div>
    )
}
