"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { UploadDropzone } from "@/components/uploader/UploadDropzone";
import { Loader2, Plus, UserCheck, Edit3, Clock, CalendarOff, MapPin, Calendar, UserPlus, CheckCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProviderBlocksDialog } from "./ProviderBlocksDialog";
import { WeeklyScheduleEditor, WeeklyScheduleState, DEFAULT_WEEKLY_SCHEDULE } from "./WeeklyScheduleEditor";
import Image from "next/image";

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
  // Acceso
  createAccount: false,
  email: "",
  password: ""
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
  user_id?: string | null;
  email?: string | null; // Added
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
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
    setInviteEmail("");
    setShowPassword(false);
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
        createAccount: false,
        email: "",
        password: "" 
      });
    } else {
      setEditingId(null);
      setForm({ ...EMPTY_FORM, defaultLocationId: locations[0]?.id ?? "", weeklySchedule: DEFAULT_WEEKLY_SCHEDULE });
    }
    setDialogOpen(true);
  };

  const handleInviteProvider = async () => {
    if (!inviteEmail || !editingId) return;
    setInviting(true);
    try {
        // 1. Invite User
        const userRes = await fetch("/api/settings/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: inviteEmail, role: "staff" }),
        });
        const userData = await userRes.json();
        if (!userRes.ok) throw new Error(userData.error || "Error al crear usuario");

        // 2. Link to Provider
        const linkRes = await fetch(`/api/settings/providers/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userData.userId }),
        });
        if (!linkRes.ok) throw new Error("Error al vincular profesional");

        toast({ title: "Acceso habilitado", description: `Se enviará un email a ${inviteEmail}` });
        setInviteEmail("");
        await loadData();
    } catch (e) {
        toast({ title: "Error", description: e instanceof Error ? e.message : "Error desconocido", variant: "destructive" });
    } finally {
        setInviting(false);
    }
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
        email: form.createAccount ? form.email : undefined,
        password: form.createAccount ? form.password : undefined
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
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                  {collection.map((provider) => (
                    <div
                      key={provider.id}
                      className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                    >
                      {/* Header: Avatar + Info + Badge */}
                      <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border border-slate-100 bg-slate-50">
                              {provider.avatar_url ? (
                                  <Image 
                                    src={provider.avatar_url} 
                                    alt={provider.full_name} 
                                    fill 
                                    className="object-cover" 
                                    unoptimized
                                    sizes="56px"
                                  />
                              ) : (
                                  <div  
                                      className="flex h-full w-full items-center justify-center text-lg font-bold text-white uppercase"
                                      style={{ backgroundColor: provider.color ?? "#94a3b8" }}
                                  >
                                      {provider.full_name.substring(0, 2)}
                                  </div>
                              )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                  <h4 className="truncate text-base font-bold text-slate-900 pr-2">{provider.full_name}</h4>
                                  <span
                                      className={cn(
                                          "inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                          provider.active 
                                            ? "bg-emerald-100 text-emerald-700" 
                                            : "bg-slate-100 text-slate-600"
                                      )}
                                  >
                                      {provider.active ? "Activo" : "Pausado"}
                                  </span>
                              </div>
                              
                              {/* Location & Specialties */}
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span className="flex items-center gap-1 text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                      <MapPin className="h-3 w-3" />
                                      {locationName(provider.default_location_id)}
                                  </span>
                                  {provider.specialties.slice(0, 2).map(s => (
                                      <span key={s} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                                          {s}
                                      </span>
                                  ))}
                                  {provider.specialties.length > 2 && (
                                      <span className="text-[10px] text-slate-400">+{provider.specialties.length - 2}</span>
                                  )}
                              </div>
                          </div>
                      </div>
                      
                      {/* Bio or Empty State */}
                      <div className="mt-4 mb-4 min-h-[2.5rem]">
                          {provider.bio ? (
                              <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                  {provider.bio}
                              </p>
                          ) : (
                              <p className="text-sm text-slate-400 italic">Sin biografía disponible.</p>
                          )}
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                          <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 gap-2 text-slate-500 hover:text-indigo-600 px-2" 
                                onClick={() => setBlocksProvider(provider)}
                                title="Gestionar bloqueos y vacaciones"
                              >
                                  <CalendarOff className="h-4 w-4" />
                                  <span className="hidden sm:inline text-xs">Bloqueos</span>
                              </Button>
                          </div>

                          <div className="flex items-center gap-2">
                              {provider.active && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => toggleActive(provider)}
                                    className="h-8 w-8 p-0 sm:w-auto sm:px-3 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    title="Pausar profesional"
                                  >
                                      <span className="sm:hidden">⏸</span>
                                      <span className="hidden sm:inline text-xs font-medium">Pausar</span>
                                  </Button>
                              )}
                              {!provider.active && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => toggleActive(provider)}
                                    className="h-8 w-8 p-0 sm:w-auto sm:px-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  >
                                      <span className="sm:hidden">▶</span>
                                      <span className="hidden sm:inline text-xs font-medium">Activar</span>
                                  </Button>
                              )}
                              
                              <Button 
                                size="sm" 
                                className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 shadow-sm" 
                                onClick={() => handleOpen(provider)}
                              >
                                  Editar
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

            <div className="space-y-2">
              <Label>Consultorio Principal</Label>
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
              <p className="text-xs text-slate-500">
                 Se usará para asignar turnos rápidos en esta sede.
              </p>
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

            {/* SECCIÓN UNIFICADA DE ACCESO */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
               {editingId && providers.find(p => p.id === editingId)?.user_id ? (
                  // CASO 1: YA TIENE USUARIO VINCULADO
                  <div className="flex flex-col gap-2">
                     <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        Acceso Habilitado
                     </p>
                     <p className="text-xs text-slate-500 pl-6">
                        Este profesional ingresa con: <span className="font-mono text-slate-800">{providers.find(p => p.id === editingId)?.email || "Email desconocido"}</span>
                     </p>
                     <p className="text-[10px] text-slate-400 pl-6 italic">
                        La contraseña no es visible por seguridad.
                     </p>
                  </div>
               ) : (
                  // CASO 2: NO TIENE USUARIO (O ES NUEVO) -> Formulario de Creación
                  <>
                    <div className="flex items-center gap-2">
                        <Checkbox 
                            id="createAccount" 
                            checked={form.createAccount}
                            onCheckedChange={(c: boolean) => setForm(prev => ({ ...prev, createAccount: c === true }))}
                        />
                        <Label htmlFor="createAccount" className="cursor-pointer font-medium text-slate-700">
                            {editingId ? "Dar de alta usuario de acceso" : "Crear usuario de acceso"}
                        </Label>
                    </div>

                    {form.createAccount && (
                        <div className="grid gap-3 pl-6 animate-in fade-in slide-in-from-top-2">
                            <p className="text-xs text-slate-500 mb-1">
                               Se creará un usuario para que este profesional gestione su propia agenda.
                            </p>
                            <div className="space-y-1">
                                <Label htmlFor="newEmail">Email de acceso</Label>
                                <Input 
                                    id="newEmail"
                                    type="email"
                                    placeholder="doctor@clinica.com"
                                    value={form.email}
                                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="newPass">Contraseña provisional</Label>
                                <div className="relative">
                                  <Input 
                                      id="newPass"
                                      type={showPassword ? "text" : "password"}
                                      placeholder="******"
                                      value={form.password}
                                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                      className="pr-10"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-slate-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? "Ocultar" : "Mostrar"}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                                <p className="text-xs text-slate-400">Mínimo 6 caracteres.</p>
                            </div>
                        </div>
                    )}
                  </>
               )}
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
