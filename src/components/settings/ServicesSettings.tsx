"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Edit3, DollarSign } from "lucide-react";
import { UploadDropzone } from "@/components/uploader/UploadDropzone";
import { cn } from "@/lib/utils";

function createEmptyForm() {
  return {
    name: "",
    description: "",
    durationMinutes: 30,
    price: "",
    currency: "ARS",
    color: "",
    imageUrl: "",
  };
}

const COLOR_PRESETS = [
  { label: "Rubor intenso", value: "#F6708D" },
  { label: "Coral quemado", value: "#FF8A5B" },
  { label: "Miel suave", value: "#FFC98B" },
  { label: "Lavanda humo", value: "#B6A5FF" },
  { label: "Pizarra profunda", value: "#223344" },
];

type ServiceRecord = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_minor_units: number | null;
  currency: string;
  color: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
};

function formatPrice(minorUnits: number | null, currency: string) {
  if (minorUnits === null) return "Sin precio";
  const value = minorUnits / 100;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(value);
}

export function ServicesSettings() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(createEmptyForm);
  const { toast } = useToast();

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/services");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Error al cargar servicios");
      setServices(payload.services ?? []);
    } catch (error) {
      console.error(error);
      toast({
        title: "No pudimos cargar los servicios",
        description: error instanceof Error ? error.message : "Intente nuevamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const handleOpen = (service?: ServiceRecord) => {
    if (service) {
      setEditingId(service.id);
      setForm({
        name: service.name,
        description: service.description ?? "",
        durationMinutes: service.duration_minutes,
        price: service.price_minor_units ? String(service.price_minor_units / 100) : "",
        currency: service.currency ?? "ARS",
        color: service.color ?? "",
        imageUrl: service.image_url ?? "",
      });
    } else {
      setEditingId(null);
      setForm(createEmptyForm());
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() ? form.description.trim() : undefined,
        durationMinutes: Number(form.durationMinutes) || 30,
        price: form.price ? Number(form.price) : undefined,
        currency: form.currency.trim() || "ARS",
        color: form.color.trim() ? form.color.trim() : undefined,
        imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : undefined,
      };

      const endpoint = editingId ? `/api/settings/services/${editingId}` : "/api/settings/services";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "No pudimos guardar");

      toast({ title: "Servicio guardado", description: `${payload.name} actualizado correctamente.` });
      setDialogOpen(false);
      setForm(createEmptyForm());
      await loadServices();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un problema inesperado",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service: ServiceRecord) => {
    try {
      const res = await fetch(`/api/settings/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !service.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "No pudimos actualizar el estado");
      await loadServices();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar",
        variant: "destructive",
      });
    }
  };

  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);
  const inactiveServices = useMemo(() => services.filter((s) => !s.active), [services]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Tratamientos & Servicios</CardTitle>
          <CardDescription>Define la carta que verá el paciente al reservar.</CardDescription>
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo servicio
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando servicios...
          </div>
        ) : (
          <div className="space-y-6">
            {[activeServices, inactiveServices].map((collection, idx) => (
              <div key={idx} className="space-y-3">
                {idx === 0 ? (
                  <p className="text-sm font-semibold text-slate-600">Activos ({collection.length})</p>
                ) : (
                  collection.length > 0 && <p className="text-sm font-semibold text-slate-500">Pausados</p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {collection.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-2xl border border-slate-200/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{service.name}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            {service.duration_minutes} min · {formatPrice(service.price_minor_units, service.currency)}
                          </p>
                        </div>
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            background: service.color ?? (service.active ? "#0f172a" : "#94a3b8"),
                            color: "white",
                          }}
                        >
                          {service.active ? "Activo" : "Pausado"}
                        </span>
                      </div>
                      {service.description && (
                        <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                      )}
                      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                        <span>Orden #{service.sort_order}</span>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpen(service)}>
                            <Edit3 className="mr-1 h-4 w-4" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(service)}>
                            {service.active ? "Pausar" : "Activar"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {collection.length === 0 && idx === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      Agrega tu primer servicio para comenzar a vender online.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
            <DialogDescription>Los pacientes verán esta información antes de confirmar su turno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Duración (min)</Label>
                <div className="relative">
                   <Input
                     type="number"
                     min={5}
                     step={5}
                     max={480}
                     value={form.durationMinutes}
                     onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                   />
                   <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                     minutos
                   </span>
                </div>
                <p className="text-[10px] text-slate-500">Tiempo que ocupará en la agenda.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Precio</Label>
                <div className="flex items-center rounded-lg border border-slate-200">
                  <span className="px-2 text-slate-400">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="border-0 focus-visible:ring-0"
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Input
                  value={form.currency}
                  maxLength={3}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  placeholder="#F6708D"
                  value={form.color}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => {
                    const isActive = preset.value.toLowerCase() === form.color.trim().toLowerCase();
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, color: preset.value }))}
                        className={cn(
                          "flex h-9 items-center rounded-full border px-3 text-xs font-medium text-slate-700 transition",
                          isActive ? "border-slate-900 shadow-sm" : "border-transparent"
                        )}
                        style={{ backgroundColor: preset.value, color: "#fff" }}
                        aria-label={`Usar ${preset.label}`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <UploadDropzone
              label="Imagen destacada (opcional)"
              description="Arrastrá la imagen o usá la cámara. Ideal 1200x800px."
              value={form.imageUrl}
              folder="services"
              accept="image/*"
              capture="environment"
              onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url ?? "" }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
