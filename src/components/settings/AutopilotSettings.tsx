"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { TEMPLATE_NAMES, templatePreview } from "@/lib/messages";
import { Loader2, Save } from "lucide-react";

type Template = {
  name: string;
  content: string;
  status: string;
};

const templateConfig: Record<string, { label: string; description: string }> = {
  [TEMPLATE_NAMES.appointmentCreated]: { 
    label: "Confirmación inmediata", 
    description: "Mensaje enviado automáticamente al agendar un nuevo turno." 
  },
  [TEMPLATE_NAMES.reminder24h]: { 
    label: "Recordatorio 24hs", 
    description: "Recordatorio enviado un día antes de la cita." 
  },
  [TEMPLATE_NAMES.reminder2h]: { 
    label: "Recordatorio 2hs", 
    description: "Recordatorio enviado el mismo día, 2 horas antes." 
  },
  [TEMPLATE_NAMES.waitlistOffer]: { 
    label: "Lista de Espera", 
    description: "Aviso automático cuando se libera un turno." 
  },
};

export function AutopilotSettings() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings/templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.templates) {
          // Ensure all known templates exist in state even if DB doesn't have them yet
          const merged = Object.values(TEMPLATE_NAMES).map(name => {
            const existing = data.templates.find((t: Template) => t.name === name);
            return existing || { 
              name, 
              content: templatePreview[name as keyof typeof templatePreview] || "", 
              status: "inactive" 
            };
          });
          setTemplates(merged);
        }
      })
      .catch((err) => {
        console.error(err);
        toast({
          title: "Error",
          description: "No se pudieron cargar las configuraciones.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates }),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast({
        title: "Cambios guardados",
        description: "La configuración de automatización ha sido actualizada.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (name: string, updates: Partial<Template>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.name === name ? { ...t, ...updates } : t))
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automatización</CardTitle>
          <CardDescription>Configura los mensajes automáticos de WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle>Automatización</CardTitle>
          <CardDescription>Gestiona tus mensajes automáticos y plantillas.</CardDescription>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        {templates.map((tpl) => {
          const config = templateConfig[tpl.name] || { label: tpl.name, description: "" };
          const isActive = tpl.status === "active";

          return (
            <div key={tpl.name} className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200">
              <div className="mb-4 flex items-start justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`switch-${tpl.name}`} className="text-base font-medium">
                    {config.label}
                  </Label>
                  <p className="text-sm text-slate-500">{config.description}</p>
                </div>
                <Switch
                  id={`switch-${tpl.name}`}
                  checked={isActive}
                  onCheckedChange={(checked) => 
                    updateTemplate(tpl.name, { status: checked ? "active" : "inactive" })
                  }
                />
              </div>
              
              <div className={isActive ? "opacity-100 transition-opacity" : "opacity-50 transition-opacity"}>
                <Label htmlFor={`text-${tpl.name}`} className="mb-2 block text-xs font-medium uppercase text-slate-500">
                  Plantilla del mensaje
                </Label>
                <Textarea
                  id={`text-${tpl.name}`}
                  value={tpl.content}
                  onChange={(e) => updateTemplate(tpl.name, { content: e.target.value })}
                  className="min-h-[80px] resize-y bg-white"
                  placeholder="Escribe el mensaje aquí..."
                />
                <p className="mt-2 text-xs text-slate-400">
                  Variables disponibles: {"{{1}}"}, {"{{2}}"}, etc. según corresponda.
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
