"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  const summary = items.reduce(
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
      setLocalItems((prev) => prev.filter((i) => i.id !== item.id));
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Confirmados</p>
          <p className="text-3xl font-semibold">{summary.confirmed}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pendientes</p>
          <p className="text-3xl font-semibold">{summary.pending}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">En riesgo</p>
          <p className="text-3xl font-semibold">{summary.risk}</p>
        </Card>
      </div>
      <div className="space-y-3">
        {localItems.map((item) => (
          <Card key={item.id} className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">
                {item.time} · {item.patient}
              </p>
              <p className="text-sm text-slate-500">Último toque hace 4h</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge label={item.status} color={item.status} />
              <Button
                variant={item.action === "cancel" ? "destructive" : "outline"}
                onClick={() => handleAction(item)}
                disabled={loadingId === item.id}
              >
                {loadingId === item.id ? "Guardando..." : item.action === "confirm" ? "Confirmar" : "Cancelar"}
              </Button>
            </div>
          </Card>
        ))}
        {localItems.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">Sin turnos para hoy.</p>
          </Card>
        )}
      </div>
    </section>
  );
}
