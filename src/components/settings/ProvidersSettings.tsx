"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, UserCheck, Edit3 } from "lucide-react";

const EMPTY_FORM = {
  fullName: "",
  bio: "",
  avatarUrl: "",
  color: "",
  defaultLocationId: "",
  specialties: "",
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
};

type LocationOption = { id: string; name: string };

type ProvidersSettingsProps = {
  locations: LocationOption[];
};

export function ProvidersSettings({ locations }: ProvidersSettingsProps) {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { toast } = useToast();

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/providers");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Error al cargar profesionales");
      setProviders(payload.providers ?? []);
    } catch (error) {
      toast({
        title: "No pudimos cargar los profesionales",
        description: error instanceof Error ? error.message : "Reintentá en unos segundos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const handleOpen = (provider?: ProviderRecord) => {
    if (provider) {
      setEditingId(provider.id);
      setForm({
        fullName: provider.full_name,
        bio: provider.bio ?? "",
        avatarUrl: provider.avatar_url ?? "",
        color: provider.color ?? "",
        defaultLocationId: provider.default_location_id ?? "",
        specialties: provider.specialties.join(", "),
      });
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        bio: form.bio.trim() ? form.bio.trim() : undefined,
        avatarUrl: form.avatarUrl.trim() ? form.avatarUrl.trim() : undefined,
        color: form.color.trim() ? form.color.trim() : undefined,
        defaultLocationId: form.defaultLocationId || undefined,
        specialties: form.specialties
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
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
      await loadProviders();
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
      await loadProviders();
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
      <CardHeader className="flex items-center justify-between gap-4">
        <div>
          <CardTitle>Equipo & Profesionales</CardTitle>
          <CardDescription>Asigna responsables para cada tratamiento.</CardDescription>
        </div>
        <Button onClick={() => handleOpen()}>
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Avatar (URL)</Label>
                <Input
                  placeholder="https://..."
                  value={form.avatarUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  placeholder="#0ea5e9"
                  value={form.color}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ubicación por defecto</Label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={form.defaultLocationId}
                onChange={(e) => setForm((prev) => ({ ...prev, defaultLocationId: e.target.value }))}
              >
                <option value="">Sin asignar</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Especialidades (separadas por coma)</Label>
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
    </Card>
  );
}
