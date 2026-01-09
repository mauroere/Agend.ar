"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/calendar", label: "Calendario" },
  { href: "/today", label: "Hoy" },
  { href: "/patients", label: "Pacientes" },
  { href: "/settings", label: "Dashboard" },
];

export function Shell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Error signing out", error);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Agend.ar</p>
          <h1 className="text-3xl font-semibold">Autopilot</h1>
        </div>
        {!hideNav && (
          <div className="flex items-center gap-3">
            <nav className="flex gap-4 rounded-full border border-slate-200 bg-white/70 px-4 py-2 backdrop-blur">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium transition",
                    pathname?.startsWith(item.href)
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Saliendo..." : "Cerrar sesión"}
            </Button>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
