"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, Check, X, CalendarClock } from "lucide-react";

export type TodayItem = {
  id: string;
  patient: string;
  time: string;
  status: "pending" | "confirmed" | "risk";
  action: "confirm" | "cancel";
};

export function TodayInbox({ items }: { items: TodayItem[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState(items);
  const router = useRouter();
  const statusConfig: Record<TodayItem["status"], { label: string; className: string }> = {
    confirmed: {
      label: "Confirmado",
      className: "inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700",
    },
    pending: {
      label: "Pendiente",
      className: "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700",
    },
    risk: {
      label: "En riesgo",
      className: "inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700",
    },
  };
  
  const summary = localItems.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { confirmed: 0, pending: 0, risk: 0 } as Record<TodayItem["status"], number>,
  );

  async function handleAction(item: TodayItem) {
    setLoadingId(item.id);
    try {
      const endpoint = item.action === "confirm" ? "confirm" : "cancel";
      const res = await fetch(`/api/appointments/${item.id}/${endpoint}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "No se pudo actualizar el turno");
        return;
      }
      setLocalItems((prev) =>
        item.action === "confirm"
          ? prev.map((i) => (i.id === item.id ? { ...i, status: "confirmed", action: "cancel" } : i))
          : prev.filter((i) => i.id !== item.id),
      );
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.confirmed}</div>
            <p className="text-xs text-slate-500">Pacientes listos para hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending}</div>
            <p className="text-xs text-slate-500">Requieren atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Riesgo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.risk}</div>
            <p className="text-xs text-slate-500">Probable ausentismo</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agenda del Día</CardTitle>
          <CardDescription>Gestiona los turnos y confirmaciones para la jornada de hoy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {localItems.length > 0 ? (
            localItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-100">
                    <span className="text-sm">{item.time}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{item.patient}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={statusConfig[item.status].className}>{statusConfig[item.status].label}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={item.action === "cancel" ? "ghost" : "primary"}
                    size="sm"
                    className={item.action === "cancel" ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "bg-blue-600 hover:bg-blue-700"}
                    onClick={() => handleAction(item)}
                    disabled={loadingId === item.id}
                  >
                    {loadingId === item.id ? (
                      "..."
                    ) : item.action === "confirm" ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Confirmar
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4" /> Cancelar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <CalendarClock className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Todo al día</h3>
              <p>No hay turnos pendientes de gestión para hoy.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
