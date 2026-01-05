"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TEMPLATE_NAMES, templatePreview } from "@/lib/messages";

type TemplateRecord = {
  name: string;
  content: string;
  status: string;
};

const toggleMap: Record<string, string> = {
  confirm_now: TEMPLATE_NAMES.appointmentCreated,
  reminder_24: TEMPLATE_NAMES.reminder24h,
  reminder_2: TEMPLATE_NAMES.reminder2h,
};

const toggleLabels: Record<string, { label: string; description: string }> = {
  confirm_now: { label: "Confirmación inmediata", description: "Se envía al crear el turno" },
  reminder_24: { label: "Recordatorio T-24", description: "24h antes" },
  reminder_2: { label: "Recordatorio T-2", description: "2h antes" },
};

export function AutopilotSettings() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/settings/templates");
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "No se pudo cargar");
        setTemplates(body.templates as TemplateRecord[]);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleState = (key: string) => templates.find((t) => t.name === toggleMap[key])?.status === "active";

  function handleToggle(key: string, checked: boolean) {
    setTemplates((prev) =>
      prev.map((tpl) =>
        tpl.name === toggleMap[key] ? { ...tpl, status: checked ? "active" : "inactive" } : tpl,
      ),
    );
  }

  function handleContentChange(name: string, content: string) {
    setTemplates((prev) => prev.map((tpl) => (tpl.name === name ? { ...tpl, content } : tpl)));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/settings/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo guardar");
      setSuccess(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Autopiloto</h2>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
      {loading && <p className="mt-4 text-sm text-slate-500">Cargando…</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-4 text-sm text-green-700">Guardado</p>}

      {!loading && (
        <div className="mt-6 space-y-6">
          <div className="space-y-4">
            {Object.keys(toggleMap).map((key) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="font-medium">{toggleLabels[key].label}</p>
                  <p className="text-sm text-slate-500">{toggleLabels[key].description}</p>
                </div>
                <input
                  type="checkbox"
                  className="h-6 w-12 rounded-full"
                  checked={toggleState(key)}
                  onChange={(e) => handleToggle(key, e.target.checked)}
                />
              </label>
            ))}
          </div>

          <div className="space-y-6">
            {templates.map((tpl) => (
              <div key={tpl.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{tpl.name}</p>
                  <span className="text-xs uppercase text-slate-500">{tpl.status}</span>
                </div>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-slate-200 p-3 text-sm"
                  value={tpl.content ?? templatePreview[tpl.name as keyof typeof templatePreview]}
                  onChange={(e) => handleContentChange(tpl.name, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
