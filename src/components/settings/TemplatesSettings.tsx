"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { TEMPLATE_NAMES } from "@/lib/messages";
import { Loader2 } from "lucide-react";

type Template = {
  name: string;
  content: string;
  status: string;
  meta_template_name?: string | null;
};

const friendlyNames: Record<string, string> = {
  [TEMPLATE_NAMES.appointmentCreated]: "Turno Creado",
  [TEMPLATE_NAMES.reminder24h]: "Recordatorio 24hs",
  [TEMPLATE_NAMES.reminder2h]: "Recordatorio 2hs",
  [TEMPLATE_NAMES.waitlistOffer]: "Oferta Lista de Espera",
};

export function TemplatesSettings() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings/templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.templates) {
          setTemplates(data.templates);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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
        title: "Plantillas guardadas",
        description: "Los cambios se han aplicado correctamente.",
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

  const updateTemplate = (name: string, content: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.name === name ? { ...t, content } : t))
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plantillas WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plantillas WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {templates.map((tpl) => (
          <div key={tpl.name} className="space-y-2">
            <Label htmlFor={tpl.name}>{friendlyNames[tpl.name] || tpl.name}</Label>
            <Textarea
              id={tpl.name}
              value={tpl.content}
              onChange={(e) => updateTemplate(tpl.name, e.target.value)}
              rows={3}
            />
            <p className="text-xs text-slate-500">
              Variables disponibles: {"{{1}}, {{2}}, {{3}}, {{4}}"}
            </p>
          </div>
        ))}
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Cambios
        </Button>
      </CardContent>
    </Card>
  );
}
