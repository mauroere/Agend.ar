"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CreditCard, Lock, Save, ExternalLink, Landmark, Building2 } from "lucide-react";

export function PaymentsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [mpConfig, setMpConfig] = useState({
    access_token: "",
    public_key: ""
  });

  const [bankConfig, setBankConfig] = useState({
    bank_name: "",
    account_holder: "",
    cbu: "",
    alias: "",
    cuit: ""
  });
  
  const { toast } = useToast();

  useEffect(() => {
    const fetchIntegrations = async () => {
        try {
            const [mpRes, bankRes] = await Promise.all([
                fetch("/api/settings/integrations?provider=mercadopago"),
                fetch("/api/settings/integrations?provider=bank_transfer")
            ]);

            const mpData = await mpRes.json();
            if (mpData.integration?.credentials) {
                setMpConfig({
                    access_token: mpData.integration.credentials.access_token || "",
                    public_key: mpData.integration.credentials.public_key || ""
                });
            }

            const bankData = await bankRes.json();
            if (bankData.integration?.credentials) {
                setBankConfig({
                    bank_name: bankData.integration.credentials.bank_name || "",
                    account_holder: bankData.integration.credentials.account_holder || "",
                    cbu: bankData.integration.credentials.cbu || "",
                    alias: bankData.integration.credentials.alias || "",
                    cuit: bankData.integration.credentials.cuit || ""
                });
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    fetchIntegrations();
  }, []);

  const handleSaveMp = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        body: JSON.stringify({
            provider: "mercadopago",
            ...mpConfig
        })
      });

      if (!res.ok) throw new Error("Error al guardar MP");
      toast({ title: "Configuración guardada", description: "MercadoPago actualizado." });
    } catch (error) {
       toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        body: JSON.stringify({
            provider: "bank_transfer",
            ...bankConfig
        })
      });

      if (!res.ok) throw new Error("Error al guardar Banco");
      toast({ title: "Datos guardados", description: "Datos de transferencia actualizados." });
    } catch (error) {
       toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
      return (
        <Card className="border-slate-200 shadow-sm h-[300px] flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-400" />
        </Card>
      );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <CreditCard className="w-5 h-5" />
            </div>
            <div>
                <CardTitle>Pagos y Cobranzas</CardTitle>
                <CardDescription>Configurá cómo recibís los pagos de señas.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mercadopago" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="mercadopago" className="gap-2">
                    <ExternalLink className="w-4 h-4" /> MercadoPago
                </TabsTrigger>
                <TabsTrigger value="transfer" className="gap-2">
                    <Landmark className="w-4 h-4" /> Transferencia
                </TabsTrigger>
            </TabsList>
            
            {/* MercadoPago Content */}
            <TabsContent value="mercadopago" className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 mb-4">
                    <p className="text-sm text-slate-600">
                        Conectá tu cuenta de MercadoPago para crear links de pago automáticos o cobrar señas al momento de la reserva.
                    </p>
                </div>

                <div className="grid gap-2">
                    <Label>Public Key</Label>
                    <Input 
                        placeholder="TEST-..." 
                        value={mpConfig.public_key}
                        onChange={(e) => setMpConfig({...mpConfig, public_key: e.target.value})} 
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Access Token (Private)</Label>
                    <div className="relative">
                        <Input 
                            type="password"
                            placeholder="TEST-..." 
                            value={mpConfig.access_token}
                            onChange={(e) => setMpConfig({...mpConfig, access_token: e.target.value})}
                            className="pr-10"
                        />
                        <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500">
                        Obtené tus credenciales en <a href="https://www.mercadopago.com.ar/developers/panel" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">Panel de Developers <ExternalLink className="w-3 h-3"/></a>
                    </p>
                </div>
                
                <div className="pt-2 flex justify-end">
                    <Button onClick={handleSaveMp} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Guardar MercadoPago
                    </Button>
                </div>
            </TabsContent>

            {/* Bank Transfer Content */}
            <TabsContent value="transfer" className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 mb-4">
                    <p className="text-sm text-slate-600">
                        Estos datos se mostrarán al paciente al confirmar el turno si elegís la modalidad &quot;Transferencia Manual&quot;.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Banco</Label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Ej: Galicia, Santander" 
                                className="pl-9"
                                value={bankConfig.bank_name}
                                onChange={(e) => setBankConfig({...bankConfig, bank_name: e.target.value})} 
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Titular de la Cuenta</Label>
                        <Input 
                            placeholder="Nombre Apellido / Razón Social" 
                            value={bankConfig.account_holder}
                            onChange={(e) => setBankConfig({...bankConfig, account_holder: e.target.value})} 
                        />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label>CBU / CVU</Label>
                    <Input 
                        placeholder="0000000000000000000000" 
                        value={bankConfig.cbu}
                        onChange={(e) => setBankConfig({...bankConfig, cbu: e.target.value})} 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Alias</Label>
                        <Input 
                            placeholder="mi.alias.mp" 
                            className="font-medium"
                            value={bankConfig.alias}
                            onChange={(e) => setBankConfig({...bankConfig, alias: e.target.value})} 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>CUIT / CUIL</Label>
                        <Input 
                            placeholder="20-00000000-0" 
                            value={bankConfig.cuit}
                            onChange={(e) => setBankConfig({...bankConfig, cuit: e.target.value})} 
                        />
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <Button onClick={handleSaveBank} disabled={saving} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Guardar Datos Bancarios
                    </Button>
                </div>
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
