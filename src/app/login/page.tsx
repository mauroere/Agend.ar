"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Shield, Sparkles } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sellingPoints = useMemo(
    () => [
      "Recordatorios y confirmaciones automáticas",
      "WhatsApp y email integrados en un solo flujo",
      "Calendario compartido con disponibilidad en vivo",
      "Reportes diarios con métricas accionables",
    ],
    [],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    // Check if user is admin before directing
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
       // @ts-ignore
       const { data: profile } = await supabase.from("agenda_users").select("is_platform_admin").eq("id", user.id).single();
       if ((profile as any)?.is_platform_admin) {
           router.push("/admin");
           return;
       }
    }

    router.refresh();
    router.push("/today");
  }

  return (
    <Shell hideNav>
      <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-sky-50 px-6 py-12 shadow-[0_40px_120px_-50px_rgba(15,23,42,0.7)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-10 h-64 w-64 rounded-full bg-brand-300/40 blur-3xl" />
          <div className="absolute -bottom-16 right-10 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
        </div>
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-8 text-slate-900">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 shadow-sm">
              <Sparkles className="h-4 w-4 text-brand-500" />
              Autopilot Clínico
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                El acceso a tu agenda que se siente premium.
              </h1>
              <p className="text-lg text-slate-600">
                Centralizá turnos, recordatorios y conversaciones en un mismo panel, con insights listos para accionar cada mañana.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {sellingPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand-500" />
                  <p className="text-sm font-medium text-slate-700">{point}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <Shield className="h-5 w-5 text-brand-500" />
                Seguridad verificada por Supabase
              </div>
              <div className="h-6 w-px bg-slate-200" />
              Tiempo promedio de activación &lt; 5 min
            </div>
          </div>
          <Card className="w-full border-none bg-white/95 p-0 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.5)]">
            <div className="border-b border-slate-100 px-8 pb-6 pt-8">
              <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Acceso</p>
              <h2 className="text-2xl font-semibold text-slate-900">Ingresá a tu agenda</h2>
            </div>
            <form className="space-y-5 px-8 pb-8 pt-6" onSubmit={onSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">Email</label>
                <Input
                  type="email"
                  required
                  placeholder="tu@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">Contraseña</label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 text-sm text-red-700">{error}</p>}
              <Button className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ingresando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </Button>
              <div className="space-y-2 text-center text-sm text-slate-500">
                <p>
                  ¿Olvidaste tu clave? <span className="font-medium text-slate-700">Contactá al administrador</span>
                </p>
                <p>
                  ¿No tenés cuenta? {""}
                  <Link href="/register" className="font-medium text-brand-600 hover:underline">
                    Registrate
                  </Link>
                </p>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </Shell>
  );
}
