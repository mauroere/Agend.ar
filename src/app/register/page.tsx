"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <Shell>
      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Crear cuenta</p>
          <h2 className="text-2xl font-semibold">Empezá con tu agenda</h2>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm text-slate-500">Nombre de la clínica</label>
              <Input
                required
                placeholder="Clínica Demo"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-slate-500">Email</label>
              <Input
                required
                type="email"
                placeholder="tu@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-slate-500">Contraseña</label>
              <Input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">Cuenta creada. Redirigiendo…</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Creando..." : "Crear cuenta"}
            </Button>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
