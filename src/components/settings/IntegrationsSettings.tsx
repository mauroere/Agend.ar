"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ExternalLink, Save, Key, Smartphone, Building2, ShieldCheck } from "lucide-react";

export function IntegrationsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    verifyToken: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((res) => res.json())
      .then((data) => {
        if (data.integration?.credentials) {
          setConfig({
            phoneNumberId: data.integration.credentials.phoneNumberId || "",
            businessAccountId: data.integration.credentials.businessAccountId || "",
            accessToken: data.integration.credentials.accessToken || "",
            verifyToken: data.integration.credentials.verifyToken || "",
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast({
        title: "Configuración guardada",
        description: "Los datos de integración se han actualizado.",
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integración WhatsApp (Meta)</CardTitle>
          <CardDescription>Configurando conexión...</CardDescription>
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
          <CardTitle>Integración WhatsApp (Meta)</CardTitle>
          <CardDescription>
            Configurá las credenciales de la API de WhatsApp Business.
            <a 
              href="https://developers.facebook.com/apps/" 
              target="_blank" 
              rel="noreferrer"
              className="text-brand-600 hover:underline inline-flex items-center gap-1 ml-1"
            >
              Ir a Meta Developers <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phoneNumberId" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-slate-500" />
              Phone Number ID
            </Label>
            <Input
              id="phoneNumberId"
              value={config.phoneNumberId}
              onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
              placeholder="Ej: 100609346426084"
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">El ID del número de teléfono configurado en WhatsApp API.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="businessAccountId" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              Business Account ID
            </Label>
            <Input
              id="businessAccountId"
              value={config.businessAccountId}
              onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
              placeholder="Ej: 100609346426084"
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">El ID de tu cuenta comercial de Meta.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accessToken" className="flex items-center gap-2">
            <Key className="h-4 w-4 text-slate-500" />
            Access Token (Permanente)
          </Label>
          <Input
            id="accessToken"
            type="password"
            value={config.accessToken}
            onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
            placeholder="EAAG..."
            className="font-mono text-sm"
          />
          <p className="text-xs text-slate-500">Token de acceso del sistema con permisos `whatsapp_business_messaging`.</p>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-100">
          <Label htmlFor="verifyToken" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
            Verify Token (Webhook)
          </Label>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                id="verifyToken"
                value={config.verifyToken}
                onChange={(e) => setConfig({ ...config, verifyToken: e.target.value })}
                placeholder="Tu token secreto para webhooks"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Usa este mismo token al configurar el Webhook en Meta.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
