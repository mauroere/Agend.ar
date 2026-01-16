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
import { CategoriesSettings } from "./CategoriesSettings";
import { Select } from "@/components/ui/select";

function createEmptyForm() {
  return {
    name: "",
    description: "",
    durationMinutes: 30,
    price: "",
    currency: "ARS",
    color: "",
    imageUrl: "",
    categoryId: "",
    prepaymentStrategy: "none" as "none" | "full" | "fixed",
    prepaymentAmount: "",
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
  category_id: string | null;
  prepayment_strategy: "none" | "full" | "fixed" | null;
  prepayment_amount: number | null;
};

function formatPrice(minorUnits: number | null, currency: string) {
  if (minorUnits === null) return "Sin precio";
  const value = minorUnits / 100;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(value);
}

export function ServicesSettings() {
  const [view, setView] = useState<"services" | "categories">("services");
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(createEmptyForm);
  const { toast } = useToast();

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
         fetch("/api/settings/services"),
         fetch("/api/settings/categories")
      ]);
      
      const servicesData = await servicesRes.json();
      const categoriesData = await categoriesRes.json();

      if (!servicesRes.ok) throw new Error(servicesData?.error ?? "Error al cargar servicios");
      
      setServices(servicesData.services ?? []);
      setCategories(categoriesData.categories ?? []);
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
        categoryId: service.category_id ?? "",
        prepaymentStrategy: service.prepayment_strategy ?? "none",
        prepaymentAmount: service.prepayment_amount ? String(service.prepayment_amount / 100) : "",
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
        categoryId: form.categoryId.trim() ? form.categoryId : null,
        prepaymentStrategy: form.prepaymentStrategy,
        prepaymentAmount: form.prepaymentStrategy === "fixed" && form.prepaymentAmount ? Number(form.prepaymentAmount) : undefined,
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
  
  if (view === "categories") {
     return (
        <Card>
           <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <div>
                <CardTitle>Categorías y Organización</CardTitle>
                <CardDescription>Agrupá tus servicios para mostrarlos ordenados.</CardDescription>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                     onClick={() => setView("services")}
                     className="px-3 py-1.5 text-sm font-medium text-slate-500 rounded-md hover:text-slate-900 transition-colors"
                  >
                     Servicios
                  </button>
                  <button 
                     onClick={() => setView("categories")}
                     className="px-3 py-1.5 text-sm font-medium bg-white text-slate-900 shadow-sm rounded-md"
                  >
                     Categorías
                  </button>
              </div>
           </CardHeader>
           <CardContent className="pt-6">
               <CategoriesSettings />
           </CardContent>
        </Card>
     );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex flex-col gap-1">
           <div className="flex items-center justify-between sm:justify-start gap-4">
              <CardTitle>Tratamientos & Servicios</CardTitle>
              <div className="sm:hidden flex bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setView("services")} className={cn("px-2 py-1 text-xs font-medium rounded", "bg-white shadow")}>Serv.</button>
                  <button onClick={() => setView("categories")} className={cn("px-2 py-1 text-xs font-medium rounded")}>Cat.</button>
              </div>
           </div>
          <CardDescription>Define la carta que verá el paciente al reservar.</CardDescription>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row gap-3">
             <div className="hidden sm:flex bg-slate-100 p-1 rounded-lg">
                  <button 
                     onClick={() => setView("services")}
                     className="px-3 py-1.5 text-sm font-medium bg-white text-slate-900 shadow-sm rounded-md"
                  >
                     Servicios
                  </button>
                  <button 
                     onClick={() => setView("categories")}
                     className="px-3 py-1.5 text-sm font-medium text-slate-500 rounded-md hover:text-slate-900 transition-colors"
                  >
                     Categorías
                  </button>
              </div>
              
            <Button onClick={() => handleOpen()} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Nuevo servicio
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
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
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {service.category_id && categories.find(c => c.id === service.category_id) && (
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 uppercase tracking-wide">
                                    {categories.find(c => c.id === service.category_id)?.name}
                                  </span>
                              )}
                              <p className="text-xs uppercase tracking-wide text-slate-400">
                                {service.duration_minutes} min · {formatPrice(service.price_minor_units, service.currency)}
                              </p>
                          </div>
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
                        <p className="mt-3 text-sm text-slate-600 line-clamp-2">{service.description}</p>
                      )}
                      
                      {/* Footer Actions */}
                      <div className="mt-4 flex items-center justify-end gap-2 text-sm text-slate-500 border-t border-slate-100 pt-3">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-1.5 hover:text-indigo-600"
                            onClick={() => handleOpen(service)}
                          >
                            <Edit3 className="h-4 w-4" /> 
                            <span className="text-xs font-medium">Editar</span>
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                              "h-8 gap-1.5",
                              service.active ? "hover:text-amber-600 hover:bg-amber-50" : "hover:text-emerald-600 hover:bg-emerald-50"
                            )}
                            onClick={() => toggleActive(service)}
                          >
                            <span className="text-lg leading-none pb-0.5">{service.active ? "⏸" : "▶"}</span>
                            <span className="text-xs font-medium">{service.active ? "Pausar" : "Activar"}</span>
                          </Button>
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
                 <Label>Categoría</Label>
                 <Select 
                    value={form.categoryId} 
                    onChange={(e) => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
                 >
                    <option value="">Sin categoría</option>
                    {categories.map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                 </Select>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
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

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="space-y-2">
                <Label>Estrategia de Cobro</Label>
                <div className="grid gap-2">
                   <div 
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                        form.prepaymentStrategy === "none" ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                      onClick={() => setForm(prev => ({ ...prev, prepaymentStrategy: "none" }))}
                   >
                      <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", form.prepaymentStrategy === "none" ? "border-indigo-600" : "border-slate-300")}>
                         {form.prepaymentStrategy === "none" && <div className="h-2 w-2 rounded-full bg-indigo-600" />}
                      </div>
                      <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">Pago en el consultorio</p>
                          <p className="text-xs text-slate-500">No se requiere pago para reservar.</p>
                      </div>
                   </div>

                   <div 
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                        form.prepaymentStrategy === "fixed" ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                      onClick={() => setForm(prev => ({ ...prev, prepaymentStrategy: "fixed" }))}
                   >
                      <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", form.prepaymentStrategy === "fixed" ? "border-indigo-600" : "border-slate-300")}>
                         {form.prepaymentStrategy === "fixed" && <div className="h-2 w-2 rounded-full bg-indigo-600" />}
                      </div>
                      <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">Seña / Depósito</p>
                          <p className="text-xs text-slate-500">El paciente paga un monto fijo para confirmar.</p>
                      </div>
                   </div>

                   <div 
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                        form.prepaymentStrategy === "full" ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                      onClick={() => setForm(prev => ({ ...prev, prepaymentStrategy: "full" }))}
                   >
                      <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", form.prepaymentStrategy === "full" ? "border-indigo-600" : "border-slate-300")}>
                         {form.prepaymentStrategy === "full" && <div className="h-2 w-2 rounded-full bg-indigo-600" />}
                      </div>
                      <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">Pago Total Adelantado</p>
                          <p className="text-xs text-slate-500">Se cobra el 100% del valor al reservar.</p>
                      </div>
                   </div>
                </div>
              </div>

              {form.prepaymentStrategy === "fixed" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label>Monto de la Seña</Label>
                  <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                    <span className="px-3 text-slate-400">
                      <DollarSign className="h-4 w-4" />
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      className="border-0 focus-visible:ring-0"
                      value={form.prepaymentAmount}
                      onChange={(e) => setForm((prev) => ({ ...prev, prepaymentAmount: e.target.value }))}
                    />
                  </div>
                  <p className="text-xs text-slate-500">Monto que debe abonarse para confirmar el turno.</p>
                </div>
              )}
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
