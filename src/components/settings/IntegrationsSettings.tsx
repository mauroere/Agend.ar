"use client";

import { useCallback, useEffect, useState } from "react";
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
  const devTenantHeader =
    process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? (process.env.NODE_ENV === "development" ? "tenant_1" : undefined);

  const withTenantHeaders = useCallback(
    (headers: Record<string, string> = {}) =>
      devTenantHeader ? { ...headers, "x-tenant-id": devTenantHeader } : headers,
    [devTenantHeader],
  );

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const res = await fetch("/api/settings/integrations", {
          headers: withTenantHeaders(),
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload?.error || "No se pudo cargar la integración");
        }

        if (!cancelled && payload.integration?.credentials) {
          setConfig({
            phoneNumberId: payload.integration.credentials.phoneNumberId || "",
            businessAccountId: payload.integration.credentials.businessAccountId || "",
            accessToken: payload.integration.credentials.accessToken || "",
            verifyToken: payload.integration.credentials.verifyToken || "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          toast({
            title: "Error al cargar",
            description: error instanceof Error ? error.message : "No pudimos obtener la configuración.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, [toast, withTenantHeaders]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: withTenantHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(config),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.error || "Error al guardar");
      }

      toast({
        title: "Configuración guardada",
        description: "Los datos de integración se han actualizado.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron guardar los cambios.",
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
