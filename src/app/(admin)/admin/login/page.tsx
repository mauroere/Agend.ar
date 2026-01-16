"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Regular Auth
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!session?.user) {
      setError("Error de sesión desconocido.");
      setLoading(false);
      return;
    }

    // 2. Security Check: Is Platform Admin?
    const { data: userProfile, error: profileError } = await supabase
      .from("agenda_users")
      .select("is_platform_admin")
      .eq("id", session.user.id)
      .single();

    if (profileError || !userProfile?.is_platform_admin) {
      // Not an admin! Log them out immediately.
      await supabase.auth.signOut();
      setError("Acceso denegado. Esta cuenta no tiene permisos de Super Admin.");
      setLoading(false);
      return;
    }

    // Success
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-slate-50">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
             <ShieldAlert className="h-6 w-6" />
             <span className="font-bold text-lg uppercase tracking-wider">Acceso Restringido</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Super Admin Login
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ingresa tus credenciales maestras para gestionar Agend.ar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email
              </label>
              <Input
                type="email"
                placeholder="admin@agend.ar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:ring-amber-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Contraseña
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:ring-amber-500"
                required
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-900/50 p-3 text-sm text-red-200 border border-red-800">
                {error}
              </div>
            )}

            <Button 
                type="submit" 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ingresar al Panel"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
