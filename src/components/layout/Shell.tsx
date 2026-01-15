"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Menu, Stethoscope } from "lucide-react";

const NAV = [
  { href: "/calendar", label: "Agenda" },
  { href: "/today", label: "Turnos" },
  { href: "/patients", label: "Pacientes" },
  { href: "/professionals", label: "Profesionales" },
  { href: "/settings", label: "Dashboard" },
  { href: "/profile", label: "Mi Perfil" },
];

export function Shell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [open, setOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  
  const [profile, setProfile] = useState<{ role: string; tenantName?: string; logoUrl?: string | null } | null>(null);

  useEffect(() => {
    const init = async () => {
      // Simple cookie check for impersonation
      if (document.cookie.includes("agendar-impersonate-tenant")) {
        setIsImpersonating(true);
      }

      try {
        const res = await fetch("/api/me");
        if (res.ok) {
           const data = await res.json();
           setProfile({ role: data.role, tenantName: data.tenantName, logoUrl: data.logoUrl });
        }
      } catch (e) {
        console.error("Error fetching profile", e);
      }
    };
    
    void init();
  }, []);

  const visibleNav = NAV.filter(item => {
      // Hide Dashboard/Settings for staff, OR if profile is not yet loaded (security/UX)
      if (item.href === "/settings") {
         if (!profile) return false; // Loading -> Hide
         if (profile.role === "staff") return false; // Staff -> Hide
      }

      // Hide Profile for owner, OR if profile is not yet loaded
      if (item.href === "/profile") {
         if (!profile) return false; // Loading -> Hide
         if (profile.role === "owner") return false; // Owner -> Hide
      }
      return true;
  });

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
      {isImpersonating && (
        <div className="w-full bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 rounded-md flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
             <span className="text-sm font-semibold flex items-center gap-2">
                🕵️ Modo SuperAdmin: Estás viendo la app como este tenant.
             </span>
             <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-amber-50 h-7 text-xs border-amber-300"
                onClick={async () => {
                   await fetch("/api/admin/impersonate", { method: "DELETE" });
                   window.location.href = "/admin/tenants";
                }}
             >
                Salir
             </Button>
        </div>
      )}
      <header className="flex items-center justify-between sticky top-0 z-40 bg-slate-50/90 backdrop-blur-sm py-2 -mx-4 px-4 md:static md:bg-transparent md:p-0">
        <div className="flex items-center gap-4">
          {profile?.logoUrl && (
            <div className="relative h-12 w-12 md:h-14 md:w-14 flex-shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
              <Image
                src={profile.logoUrl}
                alt={profile.tenantName || "Logo"}
                fill
                className="object-contain p-1"
              />
            </div>
          )}
          <div>
            <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-slate-500">
              {profile?.tenantName ? profile.tenantName : "Agend.ar"}
            </p>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-3xl font-semibold">
                {profile?.tenantName ? "Agenda" : "Automatización"}
              </h1>
              {profile?.role === "staff" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                      <Stethoscope className="h-3 w-3" />
                      Profesional
                  </span>
              )}
            </div>
          </div>
        </div>
        {!hideNav && (
          <>
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-3">
              <nav className="flex gap-4 rounded-full border border-slate-200 bg-white/70 px-4 py-2 backdrop-blur">
                {visibleNav.map((item) => (
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
                      {visibleNav.map((item) => (
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
