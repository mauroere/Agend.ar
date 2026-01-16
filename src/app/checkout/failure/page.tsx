// src/app/checkout/failure/page.tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { XCircle } from "lucide-react";

export default function CheckoutFailurePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Hubo un problema</h1>
        <p className="mb-8 text-slate-600">
          No pudimos procesar tu pago. Por favor, intentá nuevamente o contactate con nosotros.
        </p>
        <Button variant="outline" className="w-full">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
