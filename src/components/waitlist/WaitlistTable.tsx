"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WaitlistRowView = {
  id: string;
  patient: string;
  phone: string;
  priority: number;
  active: boolean;
  optOut: boolean;
};

export function WaitlistTable({ rows }: { rows: WaitlistRowView[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [localRows, setLocalRows] = useState(rows);
  const router = useRouter();

  async function handleResolve(id: string) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/waitlist/${id}`, { method: "PATCH" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "No se pudo actualizar");
        return;
      }
      setLocalRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="py-2">Paciente</th>
            <th>Teléfono</th>
            <th>Prioridad</th>
            <th>Opt-out</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {localRows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="py-3 font-medium">{row.patient}</td>
              <td>{row.phone}</td>
              <td>{row.priority}</td>
              <td>{row.optOut ? "STOP" : "OK"}</td>
              <td className={cn(row.active ? "text-green-700" : "text-slate-500")}>{row.active ? "Sí" : "No"}</td>
              <td>
                {row.active && (
                  <Button size="sm" variant="secondary" onClick={() => handleResolve(row.id)} disabled={loadingId === row.id}>
                    {loadingId === row.id ? "Guardando..." : "Resolver"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {localRows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-center text-slate-500">
                Sin pacientes en espera.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
