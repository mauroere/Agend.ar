"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Globe, Palette, Sparkles, Link as LinkIcon } from "lucide-react";
import { UploadDropzone } from "@/components/uploader/UploadDropzone";
import { cn } from "@/lib/utils";
import { validateAndFormatPhone } from "@/lib/phone-utils";

const defaultBranding = {
  companyDisplayName: "",
  heroTitle: "Mostrá tus turnos en vivo",
  heroSubtitle: "Tus pacientes reservan en segundos. Sin mensajes, sin planillas.",
  heroTagline: "Agenda automática",
  accentColor: "#a855f7",
  accentGradient: "",
  buttonText: "Reservar turno",
  logoUrl: "",
  heroImageUrl: "",
  contactPhone: "",
  contactEmail: "",
  schedule: "",
};

const palettePresets = [
  {
    label: "Lavanda editorial",
    color: "#7c3aed",
    gradient: "linear-gradient(135deg,#7c3aed,#ec4899)",
  },
  {
    label: "Verde nébula",
    color: "#0f766e",
    gradient: "linear-gradient(135deg,#0f766e,#14b8a6)",
  },
  {
    label: "Coral cálido",
    color: "#f97316",
    gradient: "linear-gradient(135deg,#f97316,#ef4444)",
  },
  {
    label: "Cielo eléctrico",
    color: "#2563eb",
    gradient: "linear-gradient(135deg,#2563eb,#7c3aed)",
  },
  {
    label: "Champagne",
    color: "#c084fc",
    gradient: "linear-gradient(135deg,#fbd38d,#f472b6)",
  },
  {
    label: "Minimal oscuro",
    color: "#0f172a",
    gradient: "",
  },
] as const;

type MicrositeState = {
  publicSlug: string;
  customDomain: string;
} & typeof defaultBranding;

export function MicrositeSettings() {
  const [form, setForm] = useState<MicrositeState>({
    publicSlug: "",
    customDomain: "",
    ...defaultBranding,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const { toast } = useToast();

  const previewUrl = useMemo(() => {
    if (!form.publicSlug) return null;
    return `https://${form.publicSlug}.${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "agend.ar"}`;
  }, [form.publicSlug]);

  const fallbackPreview = useMemo(() => {
    if (!form.publicSlug) return null;
    return `http://localhost:3000/book/${form.publicSlug}`; // Maintain this for local debugging of the namespace, although route rewrite makes root work too.
  }, [form.publicSlug]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings/microsite");
        if (!res.ok) throw new Error("No pudimos cargar la configuración");
        const data = await res.json();
        const tenant = data?.tenant;
        setForm((prev) => ({
          ...prev,
          publicSlug: tenant?.publicSlug ?? "",
          customDomain: tenant?.customDomain ?? "",
          companyDisplayName: tenant?.metadata?.companyDisplayName ?? "",
          heroTitle: tenant?.metadata?.heroTitle ?? defaultBranding.heroTitle,
          heroSubtitle: tenant?.metadata?.heroSubtitle ?? defaultBranding.heroSubtitle,
          heroTagline: tenant?.metadata?.heroTagline ?? defaultBranding.heroTagline,
          accentColor: tenant?.metadata?.accentColor ?? defaultBranding.accentColor,
          accentGradient: tenant?.metadata?.accentGradient ?? defaultBranding.accentGradient,
          buttonText: tenant?.metadata?.buttonText ?? defaultBranding.buttonText,
          logoUrl: tenant?.metadata?.logoUrl ?? "",
          heroImageUrl: tenant?.metadata?.heroImageUrl ?? "",
          contactPhone: tenant?.metadata?.contactPhone ?? "",
          contactEmail: tenant?.metadata?.contactEmail ?? "",
          schedule: tenant?.metadata?.schedule ?? "",
        }));
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "No pudimos cargar el micrositio",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const updateField = (field: keyof MicrositeState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.publicSlug.trim()) {
      toast({
        title: "Falta el subdominio",
        description: "Ingresá un slug público antes de guardar",
        variant: "destructive",
      });
      return;
    }

    let finalPhone = form.contactPhone;

    if (form.contactPhone) {
      const { isValid, formatted, error } = validateAndFormatPhone(form.contactPhone);
      if (!isValid) {
        setPhoneError(error || "Número inválido");
        toast({
          title: "Teléfono inválido",
          description: error || "Por favor verificá el número de contacto.",
          variant: "destructive",
        });
        return;
      }
      if (formatted) finalPhone = formatted;
    }

    setSaving(true);
    try {
      const payload = {
        publicSlug: form.publicSlug,
        customDomain: form.customDomain,
        metadata: {
          companyDisplayName: form.companyDisplayName,
          heroTitle: form.heroTitle,
          heroSubtitle: form.heroSubtitle,
          heroTagline: form.heroTagline,
          accentColor: form.accentColor,
          accentGradient: form.accentGradient || null,
          buttonText: form.buttonText,
          logoUrl: form.logoUrl || null,
          heroImageUrl: form.heroImageUrl || null,
          contactPhone: finalPhone || null,
          contactEmail: form.contactEmail || null,
          schedule: form.schedule || null,
        },
      };

      const res = await fetch("/api/settings/microsite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos guardar");
      }

      toast({ title: "Micrositio actualizado" });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message ?? "Revisá los campos e intentá nuevamente",
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
          <CardTitle>Micrositio público</CardTitle>
          <CardDescription>Cargando configuración...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-500" /> Micrositio público
        </CardTitle>
        <CardDescription>
          Personalizá la URL y el branding del sitio donde tus pacientes reservan turnos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="slug">Subdominio</Label>
            <Input
              id="slug"
              value={form.publicSlug}
              onChange={(event) => updateField("publicSlug", event.target.value)}
              placeholder="estetica-bella"
            />
            <p className="text-sm text-slate-500">
              Tus pacientes accederán a <span className="font-semibold">{previewUrl ?? "tu-subdominio.agend.ar"}</span>
            </p>
            {fallbackPreview ? (
              <p className="text-xs text-slate-400">
                Antes de delegar el dominio podés previsualizar en <span className="font-semibold">{fallbackPreview}</span>
              </p>
            ) : null}
          </div>
          <div className="space-y-3">
            <Label htmlFor="domain">Dominio personalizado</Label>
            <Input
              id="domain"
              value={form.customDomain}
              placeholder="reservas.tumarca.com"
              onChange={(event) => updateField("customDomain", event.target.value)}
            />
            <p className="text-sm text-slate-500">
              Configurá un CNAME apuntando a <code>app.agend.ar</code>. Validaremos el dominio automáticamente.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <UploadDropzone
            label="Logo"
            description="Arrastrá el archivo o usa la cámara para subirlo. Admitimos PNG, JPG, SVG."
            value={form.logoUrl}
            folder="logos"
            accept="image/*"
            capture="environment"
            onChange={(url) => updateField("logoUrl", url ?? "")}
          />
          <UploadDropzone
            label="Foto principal"
            description="Imagen que mostramos en el héroe del micrositio. Ideal 1600x900."
            value={form.heroImageUrl}
            folder="microsite"
            accept="image/*"
            capture="environment"
            onChange={(url) => updateField("heroImageUrl", url ?? "")}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Palette className="h-4 w-4 text-slate-500" /> Paleta principal
            </Label>
          </div>
          <p className="text-sm text-slate-500">
            Elegí una combinación curada. Aplicamos el color y gradiente en CTA, botones y acentos.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {palettePresets.map((preset) => {
              const active =
                form.accentColor === preset.color && (form.accentGradient ?? "") === (preset.gradient ?? "");
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={cn(
                    "flex flex-col items-start rounded-2xl border px-3 py-3 text-left text-xs text-slate-600 transition",
                    active ? "border-slate-900 bg-white" : "border-slate-200 bg-slate-50 hover:border-slate-400"
                  )}
                  onClick={() => {
                    updateField("accentColor", preset.color);
                    updateField("accentGradient", preset.gradient ?? "");
                  }}
                >
                  <span
                    className="mb-2 block h-10 w-full rounded-xl"
                    style={
                      preset.gradient
                        ? { backgroundImage: preset.gradient }
                        : { backgroundColor: preset.color }
                    }
                  />
                  <span className="font-semibold text-slate-800">{preset.label}</span>
                  <span>{preset.gradient ? "Color + gradiente" : "Color pleno"}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1 transition hover:border-slate-400"
              onClick={() => updateField("accentGradient", "")}
            >
              Usar sólo color pleno
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="companyDisplayName" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-500" /> Nombre de la empresa
            </Label>
            <Input
              id="companyDisplayName"
              value={form.companyDisplayName}
              onChange={(event) => updateField("companyDisplayName", event.target.value)}
              placeholder="Ej: Clínica Belgrano"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="heroTitle">Título principal</Label>
            <Input
              id="heroTitle"
              value={form.heroTitle}
              onChange={(event) => updateField("heroTitle", event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="heroSubtitle">Descripción</Label>
            <Textarea
              id="heroSubtitle"
              className="min-h-[90px]"
              value={form.heroSubtitle}
              onChange={(event) => updateField("heroSubtitle", event.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="heroTagline">Tagline</Label>
            <Input
              id="heroTagline"
              value={form.heroTagline}
              onChange={(event) => updateField("heroTagline", event.target.value)}
            />
            <Label htmlFor="buttonText">Texto del botón</Label>
            <Input
              id="buttonText"
              value={form.buttonText}
              onChange={(event) => updateField("buttonText", event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3">
            <Label htmlFor="contactPhone">WhatsApp o teléfono</Label>
            <Input
              id="contactPhone"
              value={form.contactPhone}
              onChange={(event) => {
                updateField("contactPhone", event.target.value);
                if (phoneError) setPhoneError(null);
              }}
              onBlur={() => {
                if (!form.contactPhone) return;
                const { isValid, formatted, error } = validateAndFormatPhone(form.contactPhone);
                if (!isValid) {
                  setPhoneError(error || "Número inválido");
                } else if (formatted) {
                  updateField("contactPhone", formatted);
                }
              }}
              className={phoneError ? "border-red-500 ring-red-500" : ""}
              placeholder="+54 9 11 5555-5555"
            />
            {phoneError && <p className="text-xs text-red-500 font-medium">{phoneError}</p>}
          </div>
          <div className="space-y-3">
            <Label htmlFor="contactEmail">Email de contacto</Label>
            <Input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(event) => updateField("contactEmail", event.target.value)}
              placeholder="reservas@tumarca.com"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="schedule">Horario de atención</Label>
            <Input
              id="schedule"
              value={form.schedule}
              onChange={(event) => updateField("schedule", event.target.value)}
              placeholder="Lunes a viernes 9 a 19 hs"
            />
          </div>
        </div>

        {form.customDomain && (
          <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-semibold"><LinkIcon className="h-4 w-4" /> Pasos para publicar</p>
            <ol className="ml-6 list-decimal space-y-1 pt-2">
              <li>Creá un registro CNAME {"<dominio>"} → <code>app.agend.ar</code>.</li>
              <li>Esperá la propagación (hasta 30 min).</li>
              <li>Visitá tu dominio para validar el SSL automáticamente.</li>
            </ol>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
