"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, MapPin, Plus, Edit3, Trash2 } from "lucide-react";

type LocationRecord = {
  id: string;
  name: string;
  address: string | null;
};

export function LocationsSettings() {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  // Desglosar la dirección en campos editables
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  
  const { toast } = useToast();

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/locations");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error cargando sitios");
      setLocations(data.locations || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No pudimos cargar los sitios de atención.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const handleOpen = (loc?: LocationRecord) => {
    if (loc) {
      setEditingId(loc.id);
      setName(loc.name);
      
      // Intentar parsear la dirección existente (formato: "Calle, Ciudad, Provincia")
      if (loc.address) {
          const parts = loc.address.split(",").map(p => p.trim());
          if (parts.length >= 3) {
              setProvince(parts.pop()!);
              setCity(parts.pop()!);
              setStreet(parts.join(", "));
          } else if (parts.length === 2) {
              setProvince(parts[1]);
              setCity(parts[0]); // Asumimos Ciudad, Provincia si son 2
              setStreet("");     // Ojo acá, mejor estrategia:
              // Si son 2, es ambiguo. Pongamos todo en calle para que el user arregle.
              // Mejor: Todo en street si no matchea 3. 
              // Revertimos logica simple:
              // setStreet(loc.address);
          } else {
              setStreet(loc.address);
              setCity("");
              setProvince("");
          }
           
          // Estrategia más segura para edición:
          // Si tiene comas, tratamos de dividir. Si no, todo a calle.
           const p = loc.address.split(",").map(s => s.trim());
           if (p.length >= 3) {
               setProvince(p[p.length - 1]);
               setCity(p[p.length - 2]);
               setStreet(p.slice(0, p.length - 2).join(", "));
           } else {
               setStreet(loc.address);
               setCity("");
               setProvince("");
           }
      } else {
          setStreet("");
          setCity("");
          setProvince("");
      }
    } else {
      setEditingId(null);
      setName("");
      setStreet("");
      setCity("");
      setProvince("");
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Reconstruir dirección completa
      const fullAddressParts = [street, city, province].map(s => s.trim()).filter(Boolean);
      const fullAddress = fullAddressParts.length > 0 ? fullAddressParts.join(", ") : "";

      const endpoint = editingId ? `/api/settings/locations/${editingId}` : "/api/settings/locations";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address: fullAddress }),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast({ title: "Sitio guardado" });
      setDialogOpen(false);
      await loadLocations();
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "No pudimos guardar el sitio.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que querés eliminar este sitio?")) return;
    try {
      const res = await fetch(`/api/settings/locations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      toast({ title: "Sitio eliminado" });
      router.refresh();
      await loadLocations();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar (quizás tiene turnos asociados).",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-500" /> Sitios de Atención
          </CardTitle>
          <CardDescription>
            Gestioná los consultorios o sucursales donde atendés.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => handleOpen()} variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Nuevo sitio
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {locations.length === 0 && (
              <p className="text-sm text-slate-500">No hay sitios cargados. Agregá uno para empezar.</p>
            )}
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{loc.name}</p>
                  {loc.address && <p className="text-sm text-slate-500">{loc.address}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpen(loc)}>
                    <Edit3 className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(loc.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar sitio" : "Nuevo sitio"}</DialogTitle>
            <DialogDescription>
              La dirección aparecerá en los recordatorios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del lugar</Label>
              <Input
                placeholder="Ej: Sede Central"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="rounded-lg bg-slate-50 p-4 space-y-3 border border-slate-100">
                <Label className="text-slate-900 font-semibold">Ubicación Geográfica</Label>
                <p className="text-xs text-slate-500 mb-2">Importante para que el mapa funcione correctamente.</p>
                
                <div className="space-y-2">
                  <Label className="text-xs">Calle y Altura</Label>
                  <Input
                    placeholder="Ej: Av. Libertador 1000"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-2">
                      <Label className="text-xs">Ciudad / Barrio</Label>
                      <Input
                        placeholder="Ej: Palermo"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs">Provincia</Label>
                      <Input
                        placeholder="Ej: Buenos Aires"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                      />
                   </div>
                </div>

                {(street || city) && (
                    <div className="pt-2">
                        <a 
                           href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([street, city, province, "Argentina"].filter(Boolean).join(", "))}`}
                           target="_blank"
                           rel="noreferrer"
                           className="text-xs flex items-center gap-1 text-indigo-600 hover:underline"
                        >
                            <MapPin className="h-3 w-3" />
                            Probar visualización en Google Maps
                        </a>
                    </div>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}> Cancelar </Button>
            <Button onClick={handleSave} disabled={saving || !name}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
