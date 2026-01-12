"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { UploadDropzone } from "@/components/uploader/UploadDropzone";
import { Loader2, Plus, UserCheck, Edit3, Clock, CalendarOff } from "lucide-react";
import { ProviderBlocksDialog } from "./ProviderBlocksDialog";
import { WeeklyScheduleEditor, WeeklyScheduleState, DEFAULT_WEEKLY_SCHEDULE } from "./WeeklyScheduleEditor";

const EMPTY_FORM = {
  fullName: "",
  bio: "",
  avatarUrl: "",
  defaultLocationId: "",
  specialties: "",
  useCustomSchedule: false,
  customStart: "09:00",
  customEnd: "18:00",
  weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
  serviceIds: [] as string[],
};

type ProviderRecord = {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  color: string | null;
  default_location_id: string | null;
  active: boolean;
  specialties: string[];
  metadata: any;
  serviceIds?: string[];
};

type ServiceOption = { id: string; name: string };
type LocationOption = { id: string; name: string };

type ProvidersSettingsProps = {
  locations: LocationOption[];
};

export function ProvidersSettings({ locations }: ProvidersSettingsProps) {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [blocksProvider, setBlocksProvider] = useState<ProviderRecord | null>(null); // For blocks dialog
  const [form, setForm] = useState(EMPTY_FORM);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, servRes] = await Promise.all([
        fetch("/api/settings/providers"),
        fetch("/api/settings/services")
      ]);
      
      const provData = await provRes.json();
      const servData = await servRes.json();
      
      if (!provRes.ok) throw new Error(provData?.error ?? "Error al cargar profesionales");
      
      setProviders(provData.providers ?? []);
      setServices(servData.services ?? []);
    } catch (error) {
      toast({
        title: "Error de carga",
        description: error instanceof Error ? error.message : "Reintentá en unos segundos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpen = (provider?: ProviderRecord) => {
    if (provider) {
      setEditingId(provider.id);
      
      // Parse schedule
      const existingSchedule = provider.metadata?.schedule || {};
      const hasCustomSchedule = Object.keys(existingSchedule).length > 0;
      
      const parsedSchedule: WeeklyScheduleState = { ...DEFAULT_WEEKLY_SCHEDULE };
      
      if (hasCustomSchedule) {
        (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).forEach(day => {
            const ranges = existingSchedule[day];
            if (Array.isArray(ranges) && ranges.length > 0) {
               parsedSchedule[day] = { active: true, start: ranges[0][0], end: ranges[0][1] };
            } else {
               parsedSchedule[day] = { ...DEFAULT_WEEKLY_SCHEDULE[day], active: false };
            }
        });
      }

      setForm({
        fullName: provider.full_name,
        bio: provider.bio ?? "",
        avatarUrl: provider.avatar_url ?? "",
        defaultLocationId: provider.default_location_id ?? locations[0]?.id ?? "",
        specialties: provider.specialties.join(", "),
        useCustomSchedule: hasCustomSchedule,
        customStart: "09:00",
        customEnd: "18:00",
        weeklySchedule: parsedSchedule,
        serviceIds: provider.serviceIds ?? [],
      });
    } else {
      setEditingId(null);
      setForm({ ...EMPTY_FORM, defaultLocationId: locations[0]?.id ?? "", weeklySchedule: DEFAULT_WEEKLY_SCHEDULE });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build schedule metadata if custom
      let metadata = {};
      
      if (form.useCustomSchedule) {
         const schedule: Record<string, string[][]> = {};
         Object.entries(form.weeklySchedule).forEach(([day, val]) => {
            if (val.active) {
               schedule[day] = [[val.start, val.end]];
            } else {
               schedule[day] = []; 
            }
         });
         metadata = { schedule };
      }

      const payload = {
        fullName: form.fullName.trim(),
        bio: form.bio.trim() ? form.bio.trim() : undefined,
        avatarUrl: form.avatarUrl.trim() ? form.avatarUrl.trim() : undefined,
        color: undefined, 
        defaultLocationId: form.defaultLocationId || undefined,
        specialties: form.specialties
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        metadata, 
        serviceIds: form.serviceIds,
      };

      const endpoint = editingId ? `/api/settings/providers/${editingId}` : "/api/settings/providers";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "No pudimos guardar");

      toast({ title: "Profesional guardado", description: `${payload.fullName} actualizado.` });
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Intente más tarde",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (provider: ProviderRecord) => {
    try {
      const res = await fetch(`/api/settings/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !provider.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "No pudimos actualizar");
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar",
        variant: "destructive",
      });
    }
  };

  const activeProviders = useMemo(() => providers.filter((p) => p.active), [providers]);
  const inactiveProviders = useMemo(() => providers.filter((p) => !p.active), [providers]);

  const locationName = (id: string | null) => locations.find((loc) => loc.id === id)?.name ?? "Sin asignar";

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Equipo & Profesionales</CardTitle>
          <CardDescription>Asigna responsables para cada tratamiento.</CardDescription>
        </div>
        <Button onClick={() => handleOpen()} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Nuevo profesional
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando profesionales...
          </div>
        ) : (
          <div className="space-y-6">
            {[activeProviders, inactiveProviders].map((collection, idx) => (
              <div key={idx} className="space-y-3">
                {idx === 0 ? (
                  <p className="text-sm font-semibold text-slate-600">Disponibles ({collection.length})</p>
                ) : (
                  collection.length > 0 && <p className="text-sm font-semibold text-slate-500">Pausados</p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {collection.map((provider) => (
                    <div
                      key={provider.id}
                      className="rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{provider.full_name}</p>
                          <p className="text-xs text-slate-500">{locationName(provider.default_location_id)}</p>
                        </div>
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                          style={{ background: provider.color ?? "#475569", color: "white" }}
                        >
                          {provider.active ? "Disponible" : "Pausado"}
                        </span>
                      </div>
                      {provider.bio && <p className="mt-3 text-sm text-slate-600 line-clamp-3">{provider.bio}</p>}
                      {provider.specialties.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          {provider.specialties.map((tag) => (
                            <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                        <div className="inline-flex items-center gap-1">
                          <UserCheck className="h-4 w-4" /> Agenda propia
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setBlocksProvider(provider)} title="Gestionar bloqueos/vacaciones">
                             <CalendarOff className="h-4 w-4 text-slate-400" />
                          </Button> 
                          <Button variant="ghost" size="sm" onClick={() => handleOpen(provider)}>
                            <Edit3 className="mr-1 h-4 w-4" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(provider)}>
                            {provider.active ? "Pausar" : "Activar"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {collection.length === 0 && idx === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      Sumá tu equipo para asignar turnos rápidamente.
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
            <DialogTitle>{editingId ? "Editar profesional" : "Nuevo profesional"}</DialogTitle>
            <DialogDescription>Los pacientes podrán elegir con quién atenderse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Biografía breve</Label>
              <Textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <UploadDropzone
                label="Foto de perfil"
                description="Arrastrá o sacá una foto. Formatos: PNG, JPG."
                value={form.avatarUrl}
                folder="providers"
                accept="image/*"
                capture="environment"
                onChange={(url) => setForm((prev) => ({ ...prev, avatarUrl: url ?? "" }))}
              />
            </div>

            <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
               <div className="flex items-center gap-2">
                  <Checkbox 
                     id="customScope" 
                     checked={form.useCustomSchedule}
                     onCheckedChange={(c: boolean | "indeterminate") => setForm(prev => ({ ...prev, useCustomSchedule: c === true }))}
                  />
                  <Label htmlFor="customScope" className="cursor-pointer font-medium">Definir horario propio</Label>
               </div>
               
               {form.useCustomSchedule && (
                  <div className="mt-4 sm:ml-6 ml-0">
                     <WeeklyScheduleEditor 
                        value={form.weeklySchedule} 
                        onChange={(val) => setForm(prev => ({ ...prev, weeklySchedule: val }))} 
                     />
                  </div>
               )}
               {!form.useCustomSchedule && (
                  <p className="ml-6 text-xs text-slate-500">Usa el horario general de la sede.</p>
               )}
            </div>
            
            <div className="space-y-2">
               <Label>Servicios y Tratamientos</Label>
               <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 max-h-40 overflow-y-auto">
                  {services.map((svc) => {
                     const isSelected = form.serviceIds.includes(svc.id);
                     return (
                        <div key={svc.id} className="flex items-center gap-2">
                           <Checkbox 
                              id={`svc-${svc.id}`}
                              checked={isSelected}
                              onCheckedChange={(c) => {
                                 setForm(prev => {
                                    const newIds = c 
                                       ? [...prev.serviceIds, svc.id]
                                       : prev.serviceIds.filter(id => id !== svc.id);
                                    return { ...prev, serviceIds: newIds };
                                 });
                              }}
                           />
                           <Label htmlFor={`svc-${svc.id}`} className="text-sm cursor-pointer">{svc.name}</Label>
                        </div>
                     );
                  })}
                  {services.length === 0 && <p className="text-xs text-slate-400">No hay servicios creados.</p>}
               </div>
            </div>

            <div className="space-y-2">
              <Label>Especialidades (etiquetas)</Label>
              <Input
                placeholder="Masajes, Belleza, Post-operatorio"
                value={form.specialties}
                onChange={(e) => setForm((prev) => ({ ...prev, specialties: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.fullName.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Blocks Dialog */}
      <ProviderBlocksDialog 
        open={!!blocksProvider} 
        onOpenChange={(v) => !v && setBlocksProvider(null)} 
        providerId={blocksProvider?.id ?? null}
        providerName={blocksProvider?.full_name ?? ""}
      />
    </Card>
  );
}
