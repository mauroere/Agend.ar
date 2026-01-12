"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const NAV = [
  { href: "/calendar", label: "Agenda" },
  { href: "/today", label: "Turnos" },
  { href: "/patients", label: "Pacientes" },
  { href: "/settings", label: "Dashboard" },
];

export function Shell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [open, setOpen] = useState(false);

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
    <div className="flex min-h-screen flex-col gap-6 md:gap-8 p-4 md:p-8 max-w-[1600px] mx-auto w-full">
      <header className="flex items-center justify-between sticky top-0 z-40 bg-slate-50/90 backdrop-blur-sm py-2 -mx-4 px-4 md:static md:bg-transparent md:p-0">
        <div>
          <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-slate-500">Agend.ar</p>
          <h1 className="text-xl md:text-3xl font-semibold">Automatización</h1>
        </div>
        {!hideNav && (
          <>
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-3">
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
                {isSigningOut ? "..." : "Salir"}
              </Button>
            </div>

            {/* Mobile Nav */}
            <div className="md:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Menú</SheetTitle>
                    <SheetDescription className="sr-only">
                      Menú de navegación principal
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 mt-8">
                    <nav className="flex flex-col gap-2">
                      {NAV.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "px-4 py-3 rounded-lg text-lg font-medium transition",
                            pathname?.startsWith(item.href)
                              ? "bg-slate-900 text-white"
                              : "text-slate-600 hover:bg-slate-100",
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                    <div className="border-t border-slate-100 pt-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleLogout}
                        disabled={isSigningOut}
                      >
                         Cerrar Sesión
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
      </header>
      {children}
    </div>
  );
}
