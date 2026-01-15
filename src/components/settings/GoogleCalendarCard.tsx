"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, Loader2, Unplug } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";

export function GoogleCalendarCard() {
  // In a real app, you would fetch the current status from the endpoint
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setLoading(true);
    try {
       const res = await fetch("/api/integrations/google/auth-url");
       const { url } = await res.json();
       if (url) {
          window.location.href = url;
       } else {
          throw new Error("No URL returned");
       }
    } catch (e) {
       toast({ title: "Error", variant: "destructive", description: "Falta configurar credenciales de Google Cloud." });
    } finally {
       setLoading(false);
    }
  };

  return (
    <Card className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-indigo-950">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    Google Calendar
                </CardTitle>
                <CardDescription>
                    Sincronizá tus turnos automáticamente con tu calendario personal.
                </CardDescription>
            </div>
            {isConnected && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Conectado
                </div>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
             <div className="flex flex-col gap-4">
                <p className="text-sm text-slate-600">
                    Tu cuenta <strong>usuario@gmail.com</strong> está sincronizada. Los nuevos turnos aparecerán instantáneamente.
                </p>
                <Button variant="outline" className="w-fit text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100">
                    <Unplug className="mr-2 h-4 w-4" /> Desconectar
                </Button>
             </div>
        ) : (
             <div className="flex flex-col gap-4">
                <p className="text-sm text-slate-600">
                    Conectá tu cuenta para ver todos tus turnos de Agend.ar directamente en tu Google Calendar, junto a tus eventos personales.
                </p>
                <Button onClick={handleConnect} disabled={loading} className="w-fit bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={16} height={16} className="mr-2" alt="Google" unoptimized />
                    Conectar con Google
                </Button>
             </div>
        )}
      </CardContent>
    </Card>
  );
}
