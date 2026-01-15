"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { UploadDropzone } from "@/components/uploader/UploadDropzone";
import { Loader2, CalendarOff, Save, User as UserIcon } from "lucide-react";
import { WeeklyScheduleEditor, WeeklyScheduleState, DEFAULT_WEEKLY_SCHEDULE } from "@/components/settings/WeeklyScheduleEditor";
import { ProviderBlocksDialog } from "@/components/settings/ProviderBlocksDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const EMPTY_FORM = {
  fullName: "",
  bio: "",
  avatarUrl: "",
  defaultLocationId: "",
  specialties: "",
  useCustomSchedule: false,
  weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
  serviceIds: [] as string[],
};

type MyProfileSettingsProps = {
  locations: { id: string; name: string }[];
  services: { id: string; name: string }[];
};

export function MyProfileSettings({ locations, services }: MyProfileSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("");
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings/my-profile");
        if (!res.ok) {
           if (res.status === 404) return; // No provider linked
           throw new Error("Error cargando perfil");
        }
        const data = await res.json();
        const p = data.provider;

        setProviderId(p.id);
        setProviderName(p.full_name);

        // Parse schedule
        const existingSchedule = p.metadata?.schedule || {};
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
            fullName: p.full_name,
            bio: p.bio ?? "",
            avatarUrl: p.avatar_url ?? "",
            defaultLocationId: p.default_location_id ?? "",
            specialties: (p.specialties || []).join(", "),
            useCustomSchedule: hasCustomSchedule,
            weeklySchedule: parsedSchedule,
            serviceIds: p.serviceIds ?? [],
        });
      } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "No se pudo cargar tu perfil profesional", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [toast]);

  const handleSave = async () => {
    if (!providerId) return;
    setSaving(true);
    try {
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
        defaultLocationId: form.defaultLocationId || undefined,
        specialties: form.specialties.split(",").map((item) => item.trim()).filter(Boolean),
        metadata, 
        serviceIds: form.serviceIds,
      };

      const res = await fetch("/api/settings/my-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast({ title: "Perfil actualizado", description: "Tus cambios se han guardado." });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo actualizar el perfil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
     return <div className="p-12 text-center text-slate-500"><Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" /> Cargando información...</div>;
  }

  if (!providerId) {
     return (
        <Card className="max-w-xl mx-auto mt-10">
            <CardHeader className="text-center">
                <div className="mx-auto bg-slate-100 p-3 rounded-full mb-2 w-fit">
                    <UserIcon className="h-6 w-6 text-slate-500" />
                </div>
                <CardTitle>Perfil no encontrado</CardTitle>
                <CardDescription>
                    Tu usuario no está vinculado a ningún perfil profesional. Contacta al administrador.
                </CardDescription>
            </CardHeader>
        </Card>
     );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto items-start">
        {/* Left Column: Basic Info */}
        <div className="space-y-6 lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Datos Públicos</CardTitle>
                    <CardDescription>Así te verán tus pacientes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                         <Label>Foto de Perfil</Label>
                         <UploadDropzone
                            label="Foto de perfil"
                            value={form.avatarUrl}
                            folder="providers"
                            accept="image/*"
                            onChange={(url) => setForm((prev) => ({ ...prev, avatarUrl: url ?? "" }))}
                         />
                     </div>
                     <div className="space-y-2">
                        <Label>Nombre completo</Label>
                        <Input value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} />
                     </div>
                     <div className="space-y-2">
                        <Label>Biografía breve</Label>
                        <Textarea
                            rows={4}
                            value={form.bio}
                            onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label>Especialidades (etiquetas)</Label>
                        <Input
                            placeholder="Ej. Kinesiología, Masajes"
                            value={form.specialties}
                            onChange={(e) => setForm((prev) => ({ ...prev, specialties: e.target.value }))}
                        />
                        <p className="text-xs text-slate-500">Separadas por coma</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Operatividad</CardTitle>
                    <CardDescription>Sede y bloqueos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Sede Principal (Habitual)</Label>
                        <Select
                            value={form.defaultLocationId}
                            onChange={(e) => setForm((prev) => ({ ...prev, defaultLocationId: e.target.value }))}
                        >
                            {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                            ))}
                            {!form.defaultLocationId && <option value="">Seleccionar sede...</option>}
                        </Select>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <Button 
                            variant="outline" 
                            className="w-full justify-start text-slate-600"
                            onClick={() => setBlocksOpen(true)}
                        >
                            <CalendarOff className="mr-2 h-4 w-4" />
                            Gestionar Vacaciones / Bloqueos
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Schedule & Services */}
        <div className="space-y-6 lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Horarios de Atención</CardTitle>
                    <CardDescription>Define cuándo estás disponible para turnos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <Checkbox 
                            id="customScope" 
                            checked={form.useCustomSchedule}
                            onCheckedChange={(c: boolean | "indeterminate") => setForm(prev => ({ ...prev, useCustomSchedule: c === true }))}
                        />
                        <Label htmlFor="customScope" className="cursor-pointer font-medium">Usar mi propio horario (anula el de la sede)</Label>
                     </div>
                     
                     {form.useCustomSchedule ? (
                        <div className="pl-2">
                           <WeeklyScheduleEditor 
                                value={form.weeklySchedule} 
                                onChange={(val) => setForm(prev => ({ ...prev, weeklySchedule: val }))} 
                           />
                        </div>
                     ) : (
                        <div className="p-8 text-center text-slate-400 border-2 border-dashed rounded-xl">
                            Usando horario general del consultorio.
                        </div>
                     )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                   <CardTitle>Servicios que realizo</CardTitle>
                   <CardDescription>Seleccioná qué tratamientos atendés</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {services.map((svc) => {
                            const isSelected = form.serviceIds.includes(svc.id);
                            return (
                                <div 
                                    key={svc.id} 
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isSelected ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
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
                                    <Label htmlFor={`svc-${svc.id}`} className="cursor-pointer flex-1 user-select-none">
                                        <span className="block font-medium text-slate-900">{svc.name}</span>
                                    </Label>
                                </div>
                            );
                        })}
                        {services.length === 0 && <p className="text-slate-500">No hay servicios configurados en el sistema.</p>}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 pt-4 sticky bottom-4">
                 <Button className="shadow-lg px-8" size="lg" onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                 </Button>
            </div>
        </div>

        <ProviderBlocksDialog 
            open={blocksOpen}
            onOpenChange={setBlocksOpen}
            providerId={providerId}
            providerName={providerName}
        />
    </div>
  );
}
