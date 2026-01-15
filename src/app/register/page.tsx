"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Rocket, Shield } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [clinic, setClinic] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantName: clinic, email, password }),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "No se pudo crear la cuenta");
      return;
    }

    setSuccess(true);
    // Longer timeout to read message
    setTimeout(() => router.push("/login"), 1500);
  }

  const benefits = [
    "Sitio web de reservas profesional incluido",
    "Gestión ilimitada de pacientes",
    "Recordatorios automáticos por WhatsApp",
    "Panel de administración centralizado"
  ];

  return (
    <Shell hideNav>
      <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-sky-50 px-6 py-12 shadow-[0_40px_120px_-50px_rgba(15,23,42,0.7)]">
        {/* Background Blobs matching Login */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-10 h-64 w-64 rounded-full bg-brand-300/40 blur-3xl" />
          <div className="absolute -bottom-16 right-10 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
        </div>

        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* Left Column: Visual & Benefits */}
          <div className="space-y-8 text-slate-900">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 shadow-sm">
              <Rocket className="h-4 w-4 text-brand-500" />
              Comienza Gratis
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                Llevá tu consultorio al siguiente nivel hoy.
              </h1>
              <p className="text-lg text-slate-600">
                Unite a los profesionales que han automatizado hasta el 80% de su carga administrativa.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur transition-all hover:bg-white/90">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand-500" />
                  <p className="text-sm font-medium text-slate-700">{benefit}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <Shield className="h-5 w-5 text-brand-500" />
                Datos encriptados
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <span>Sin tarjeta de crédito requerida</span>
            </div>
          </div>

          {/* Right Column: Registration Form */}
          <Card className="border-0 shadow-2xl relative overflow-hidden bg-white/80 backdrop-blur-xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-400 to-sky-400" />
            <div className="p-8">
              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Crear Cuenta</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Empezá con tu agenda</h2>
              </div>

              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nombre de la clínica</label>
                  <Input
                    required
                    className="bg-white"
                    placeholder="Ej. Centro Médico Belgrano"
                    value={clinic}
                    onChange={(e) => setClinic(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email profesional</label>
                  <Input
                    required
                    className="bg-white"
                    type="email"
                    placeholder="dr.apellido@clinica.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Contraseña</label>
                  <Input
                    required
                    className="bg-white"
                    type="password"
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex items-center gap-2">
                     <span className="block h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                     {error}
                  </div>
                )}
                
                {success && (
                   <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600 border border-emerald-100 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      ¡Cuenta creada! Redirigiendo...
                   </div>
                )}

                <Button className="w-full h-11 text-base shadow-lg shadow-brand-500/20" disabled={loading || success}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...
                    </>
                  ) : (
                    "Crear cuenta gratis"
                  )}
                </Button>

                <p className="text-center text-sm text-slate-500">
                  ¿Ya tenés cuenta?{" "}
                  <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                    Ingresá aquí
                  </Link>
                </p>
              </form>
            </div>
          </Card>
        </div>
      </section>
    </Shell>
  );
}
