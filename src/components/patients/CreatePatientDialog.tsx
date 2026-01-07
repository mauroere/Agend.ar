"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";

type PatientDialogBaseProps = {
  mode: "create" | "edit";
  onClose: () => void;
  onSuccess?: (patient: any) => void;
  patientId?: string;
  defaultValues?: {
    fullName?: string;
    phone?: string;
    notes?: string | null;
    optOut?: boolean;
  };
};

export function PatientDialog({ mode, onClose, onSuccess, patientId, defaultValues }: PatientDialogBaseProps) {
  const isEdit = mode === "edit";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(defaultValues?.fullName ?? "");
  const [phone, setPhone] = useState(defaultValues?.phone ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [optOut, setOptOut] = useState(defaultValues?.optOut ?? false);

  useEffect(() => {
    setFullName(defaultValues?.fullName ?? "");
    setPhone(defaultValues?.phone ?? "");
    setNotes(defaultValues?.notes ?? "");
    setOptOut(defaultValues?.optOut ?? false);
  }, [defaultValues]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
      fullName,
      phone,
      notes,
    };

    if (isEdit) {
      payload.optOut = optOut;
    }

    const endpoint = isEdit ? `/api/patients/${patientId}` : "/api/patients";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onSuccess?.(data.patient);
        router.refresh();
        onClose();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "No se pudo guardar el paciente");
      }
    } catch (err) {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar paciente" : "Nuevo paciente"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Actualiza los datos y el estado de comunicación." : "Ingresa los datos para registrar un nuevo paciente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4 py-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none">Nombre completo</label>
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none">Teléfono (E.164)</label>
            <Input
              required
              placeholder="+54911..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-[0.8rem] text-slate-500">Formato internacional requerido para notificaciones de WhatsApp.</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none">Notas internas</label>
            <Textarea
              placeholder="Antecedentes, alergias, preferencias..."
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Marcar como opt-out</p>
                <p className="text-xs text-slate-500">Detiene recordatorios automáticos para este paciente.</p>
              </div>
              <Switch checked={optOut} onCheckedChange={setOptOut} />
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar paciente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreatePatientDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess?: (patient: any) => void }) {
  return <PatientDialog mode="create" onClose={onClose} onSuccess={onSuccess} />;
}
