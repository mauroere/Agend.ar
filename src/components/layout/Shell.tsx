"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/calendar", label: "Calendario" },
  { href: "/today", label: "Hoy" },
  { href: "/patients", label: "Pacientes" },
  { href: "/settings", label: "Automatización" },
];

export function Shell({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col gap-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Agend.ar</p>
          <h1 className="text-3xl font-semibold">Autopilot</h1>
        </div>
        {!hideNav && (
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
        )}
      </header>
      {children}
    </div>
  );
}
