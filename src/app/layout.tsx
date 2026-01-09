import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Agend.ar",
  description: "Agenda + Autopiloto WhatsApp para profesionales de salud",
};

import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900">
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
