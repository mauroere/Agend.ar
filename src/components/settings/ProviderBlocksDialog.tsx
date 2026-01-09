"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, CalendarOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Block = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

type ProviderBlocksDialogProps = {
  providerId: string | null;
  providerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProviderBlocksDialog({ providerId, providerName, open, onOpenChange }: ProviderBlocksDialogProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // New Block Form
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  const loadBlocks = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/providers/${providerId}/blocks`);
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    if (open && providerId) {
      loadBlocks();
      setStart("");
      setEnd("");
      setReason("");
    }
  }, [open, providerId, loadBlocks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId || !start || !end) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/settings/providers/${providerId}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: new Date(start).toISOString(),
          endAt: new Date(end).toISOString(),
          reason,
        }),
      });
      if (!res.ok) throw new Error("Error al crear bloqueo");
      toast({ title: "Bloqueo creado" });
      setStart("");
      setEnd("");
      setReason("");
      loadBlocks();
    } catch (error) {
       toast({ title: "Error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (blockId: string) => {
    if (!confirm("¿Eliminar este bloqueo?")) return;
    try {
        const res = await fetch(`/api/settings/providers/${providerId}/blocks?blockId=${blockId}`, {
            method: "DELETE"
        });
        if(res.ok) {
            setBlocks(prev => prev.filter(b => b.id !== blockId));
            toast({ title: "Bloqueo eliminado" });
        }
    } catch(e) {
        toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Ausencias - {providerName}</DialogTitle>
          <DialogDescription>
             Define vacaciones, licencias o bloqueos de agenda específicos para este profesional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
            {/* Form */}
            <form onSubmit={handleCreate} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <CalendarOff className="h-4 w-4"/> Nuevo Bloqueo
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Desde</Label>
                        <Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Hasta</Label>
                        <Input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Razón (Opcional)</Label>
                    <Input placeholder="Vacaciones, Médico, etc." value={reason} onChange={e => setReason(e.target.value)} />
                </div>
                <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Agregar Bloqueo
                    </Button>
                </div>
            </form>

            {/* List */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-900">Bloqueos Activos</h4>
                {loading ? (
                    <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400"/></div>
                ) : blocks.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No hay bloqueos registrados.</p>
                ) : (
                    <div className="space-y-2">
                        {blocks.map(block => (
                            <div key={block.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">
                                        {format(new Date(block.start_at), "PPP p", { locale: es })} - 
                                        {format(new Date(block.end_at), "PPP p", { locale: es })}
                                    </p>
                                    {block.reason && <p className="text-xs text-slate-500">{block.reason}</p>}
                                </div>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(block.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
