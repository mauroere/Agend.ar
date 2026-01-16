import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Database } from "@/types/database";
import { serviceClient } from "@/lib/supabase/service";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  // Si no hay sesión, al login
  if (!session) redirect("/login");

  // @ts-ignore - Supabase type mismatch between client and service role
  const db: any = serviceClient || supabase;

  // @ts-ignore - is_platform_admin not yet in generated types
  const { data: user } = await db
    .from("agenda_users")
    .select("is_platform_admin")
    .eq("id", session.user.id)
    .single();

  if (!user?.is_platform_admin) {
    console.error("[AdminLayout] User is not platform admin:", session.user.email);
    console.error("[AdminLayout] DB returned:", user);
    // FORZAMOS EL LOGOUT SI NO ES ADMIN
    await supabase.auth.signOut();
    // Lo mandamos al login avisando por qué
    redirect("/login?error=admin-access-denied-please-login-with-admin-account");
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
        <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
            <nav className="container mx-auto flex gap-6 items-center">
                <span className="font-bold text-lg tracking-tight">Agend.ar <span className="text-amber-400">Admin</span></span>
                <a href="/admin" className="hover:text-amber-400 font-medium transition-colors">Dashboard</a>
                <a href="/admin/tenants" className="hover:text-amber-400 font-medium transition-colors">Tenants</a>
                <div className="ml-auto flex items-center gap-4">
                    <span className="text-xs text-slate-400 hidden sm:block">Super Admin Mode</span>
                    <a href="/" className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-full transition-all border border-slate-700">
                        Volver a App
                    </a>
                    <AdminLogoutButton />
                </div>
            </nav>
        </header>
        <main className="container mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {children}
        </main>
    </div>
  );
}
