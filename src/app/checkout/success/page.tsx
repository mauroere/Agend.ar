// src/app/checkout/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
     const paymentId = searchParams.payment_id;
     const appointmentId = searchParams.external_reference;

     if (paymentId && appointmentId) {
        fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, appointmentId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "confirmed") {
                setVerified(true);
            }
        })
        .catch(console.error)
        .finally(() => setVerifying(false));
     } else {
        setVerifying(false);
     }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">¡Pago Exitoso!</h1>
        <p className="mb-4 text-slate-600">
          Tu transacción fue procesada correctamente.
        </p>

        {verifying ? (
           <div className="mb-6 flex items-center justify-center gap-2 text-sm text-indigo-600">
               <Loader2 className="h-4 w-4 animate-spin" /> Confirmando turno en el sistema...
           </div>
        ) : verified ? (
           <div className="mb-8 rounded-lg bg-green-50 p-3 text-sm text-green-800 border border-green-100">
               ✅ Tu turno ha sido confirmado automáticamente.
           </div>
        ) : (
           <div className="mb-8 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 border border-amber-100">
               ⏳ Estamos terminando de confirmar tu turno. Si no recibís confirmación en unos minutos, contactanos.
           </div>
        )}
        
        <div className="text-left rounded-lg bg-slate-100 p-4 text-xs text-slate-500 mb-6 break-all space-y-1">
           <p>Referencia de reserva: <span className="font-mono text-slate-700">{searchParams.external_reference}</span></p>
           <p>ID de pago: <span className="font-mono text-slate-700">{searchParams.payment_id}</span></p>
        </div>

        <Button className="w-full">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
