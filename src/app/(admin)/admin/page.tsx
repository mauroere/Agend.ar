import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Calendar } from "lucide-react";
import { serviceClient } from "@/lib/supabase/service";

export default async function AdminDashboardPage() {
  const supabase = createServerComponentClient<Database>({ cookies });

  // Usamos serviceClient para tener permisos de super admin y ver TODA la data sin RLS
  const db = (serviceClient || supabase) as SupabaseClient<Database>;

  const { count: tenantsCount } = await db.from("agenda_tenants").select("*", { count: "exact", head: true });
  const { count: usersCount } = await db.from("agenda_users").select("*", { count: "exact", head: true });
  // You might want to count appointments too but that table might be large.
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard General</h1>
        <p className="text-slate-500 mt-2">Visión general de la plataforma SaaS.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantsCount ?? 0}</div>
            <p className="text-xs text-slate-500">Empresas registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount ?? 0}</div>
            <p className="text-xs text-slate-500">Incluyendo Staff y Dueños</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">Operativo</div>
            <p className="text-xs text-slate-500">Todas los servicios activos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
