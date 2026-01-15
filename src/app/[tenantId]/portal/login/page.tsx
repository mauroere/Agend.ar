"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";

export default function PortalLoginPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/${tenantId}/portal`,
        },
      });

      if (error) {
        throw error;
      }
      setSent(true);
      toast({ title: "Enlace enviado", description: "Revisá tu correo para ingresar." });
    } catch (err: any) {
      toast({ 
          title: "Error", 
          description: err.message || "No pudimos enviar el enlace.", 
          variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="mb-4">
            <Link href={`/${tenantId}`} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Volver a reservar
            </Link>
          </div>
          <CardTitle className="text-2xl">Mis Turnos</CardTitle>
          <CardDescription>
            Ingresá tu email para ver y gestionar tus reservas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-in fade-in zoom-in duration-300">
               <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-2xl">📩</span>
               </div>
               <h3 className="font-semibold text-green-900 mb-2">¡Enlace enviado!</h3>
               <p className="text-sm text-green-700">
                 Te enviamos un link mágico a <strong>{email}</strong>. <br/>
                 Hacé click en ese link para entrar a tu portal.
               </p>
               <Button variant="ghost" className="mt-4 text-green-800" onClick={() => setSent(false)}>
                 Probar con otro email
               </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar enlace de acceso
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
