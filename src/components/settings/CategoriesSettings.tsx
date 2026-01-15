"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Edit3, Trash2 } from "lucide-react";

type CategoryRecord = {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  active: boolean;
};

export function CategoriesSettings() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", color: "" });
  const { toast } = useToast();

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/categories");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Error al cargar categorías");
      setCategories(payload.categories ?? []);
    } catch (error) {
       // Silent error or toast?
       console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleOpen = (category?: CategoryRecord) => {
    if (category) {
      setEditingId(category.id);
      setForm({
        name: category.name,
        color: category.color ?? "",
      });
    } else {
      setEditingId(null);
      setForm({ name: "", color: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color.trim() ? form.color.trim() : null,
      };

      const endpoint = editingId 
        ? `/api/settings/categories/${editingId}` 
        : "/api/settings/categories";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No pudimos guardar");

      toast({ title: "Categoría guardada", description: "Cambios aplicados correctamente." });
      setDialogOpen(false);
      await loadCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error inesperado",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguró que querés eliminar esta categoría? Los servicios quedarán sin categoría.")) return;
    
    try {
       const res = await fetch(`/api/settings/categories/${id}`, { method: "DELETE" });
       if (!res.ok) throw new Error("No se pudo eliminar");
       
       setCategories(prev => prev.filter(c => c.id !== id));
       toast({ title: "Eliminada", description: "La categoría fue removida." });
    } catch (error) {
        toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Categorías de Servicios</h3>
         <Button variant="outline" size="sm" onClick={() => handleOpen()}>
            <Plus className="mr-2 h-3 w-3" /> Nueva Categoría
         </Button>
      </div>

      {loading ? (
          <div className="flex justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
      ) : categories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
             Creá categorías para organizar tus servicios (ej. Faciales, Corporales, Masajes).
          </div>
      ) : (
          <div className="space-y-2">
             {categories.map(cat => (
                <div key={cat.id} className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                   <div className="flex items-center gap-3">
                      <div 
                        className="h-3 w-3 rounded-full border border-slate-100 shadow-sm"
                        style={{ background: cat.color || "#e2e8f0" }}
                      />
                      <span className="font-medium text-slate-700 text-sm">{cat.name}</span>
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-indigo-600" onClick={() => handleOpen(cat)}>
                          <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-600" onClick={() => handleDelete(cat.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                   </div>
                </div>
             ))}
          </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
            <DialogDescription>Agrupá tus servicios para mostrarlos ordenados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
             <div className="space-y-2">
                <Label>Nombre</Label>
                <Input 
                   placeholder="Ej. Faciales" 
                   value={form.name} 
                   onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
             </div>
             <div className="space-y-2">
                <Label>Color (opcional)</Label>
                <div className="flex gap-2 flex-wrap">
                   {["#F6708D", "#FF8A5B", "#FFC98B", "#B6A5FF", "#223344", "#334155", "#0ea5e9"].map(c => (
                      <button
                         key={c}
                         type="button"
                         onClick={() => setForm(prev => ({ ...prev, color: c }))}
                         className={`h-6 w-6 rounded-full border-2 transition-all ${form.color === c ? "border-slate-900 scale-110" : "border-transparent"}`}
                         style={{ backgroundColor: c }}
                      />
                   ))}
                   <button 
                      type="button" 
                      onClick={() => setForm(prev => ({ ...prev, color: "" }))}
                      className="h-6 w-6 rounded-full border border-slate-200 bg-white flex items-center justify-center text-[10px] text-slate-400"
                   >
                     🚫
                   </button>
                </div>
             </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
             <Button onClick={handleSave} disabled={saving || !form.name}>
                {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin"/>}
                Guardar
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
