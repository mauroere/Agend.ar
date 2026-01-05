"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [tenantName, setTenantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tenantName }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "No se pudo crear la cuenta");
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/today");
    } catch (err) {
      setError("Error inesperado. Intentá nuevamente.");
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Registro</p>
          <h2 className="text-2xl font-semibold">Crear tu cuenta</h2>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm text-slate-500">Nombre de la clínica</label>
              <Input
                required
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Clínica Demo"
              />
            </div>
            <div>
              <label className="text-sm text-slate-500">Email</label>
              <Input
                type="email"
                required
                placeholder="admin@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-slate-500">Contraseña</label>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="text-sm text-slate-500">Confirmar contraseña</label>
              <Input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
            <p className="text-center text-sm text-slate-500">
              ¿Ya tenés cuenta? <Link className="text-blue-600" href="/login">Ingresar</Link>
            </p>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
