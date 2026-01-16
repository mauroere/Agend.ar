import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Database } from "@/types/database";
import { serviceClient } from "@/lib/supabase/service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  ExternalLink, 
  Server,
  ShieldCheck,
  AlertTriangle,
  Activity,
  LayoutDashboard,
  Globe
} from "lucide-react";
import { AdminNotes } from "./admin-notes";
import { getAdminNote } from "./actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  public_slug?: string;
  status: string | null;
  plan: string | null;
  subscription_amount: number | null;
  created_at: string;
}

export default async function AdminDashboardPage() {
  const supabase = createServerComponentClient<Database>({ cookies });
  
  // 1. Check Authentication & Permissions
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  if (!serviceClient) return <div>Error: Service unavailable</div>;

  // Check if user is platform admin
  const { data: userProfile } = await serviceClient
    .from("agenda_users")
    .select("is_platform_admin")
    .eq("id", session.user.id)
    .single();

  if (!userProfile?.is_platform_admin) {
    redirect("/");
  }

  // 2. Fetch Data (Parallel)
  const [
    allTenantsResult,
    usersResult, 
    recentTenantsResult,
    adminNote
  ] = await Promise.all([
    serviceClient.from("agenda_tenants").select("*", { count: "exact" }),
    serviceClient.from("profiles").select("*", { count: "exact", head: true }),
    serviceClient
      .from("agenda_tenants")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
    getAdminNote()
  ]);

  const allTenants = (allTenantsResult.data || []) as unknown as Tenant[];
  const tenantsCount = allTenantsResult.count ?? 0;
  const usersCount = usersResult.count ?? 0;
  const recentTenants = (recentTenantsResult.data ?? []) as unknown as Tenant[];

  // Calculate Real Metrics
  // Treat missing status as 'active' for legacy data, or explicitly check for 'active'
  const activeTenants = allTenants.filter(t => !t.status || t.status === 'active');
  const activeCount = activeTenants.length;
  
  // Calculate MRR from active subscriptions
  // Note: subscription_amount is expected in cents, so we divide by 100 if that were the case, 
  // but let's assume it's stored in dollars for simplicity based on the mockup, or handle it as is.
  // Ideally, store in cents. Let's assume the column might not exist yet (defaults to null/0).
  const mrr = activeTenants.reduce((sum, t) => sum + (t.subscription_amount || 0), 0);
  
  // Calculate Growth (Mock logic for now as we don't have historical snapshots table yet)
  // We could query tenants created this month vs last month if we wanted to be 100% precise without another table.
  const currentMonth = new Date().getMonth();
  const createdThisMonth = allTenants.filter(t => new Date(t.created_at || "").getMonth() === currentMonth).length;
  // Let's just show "New this month" instead of complex growth % for accuracy.

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">SaaS Command Center</h1>
          <p className="text-lg text-slate-500 mt-2">
            Bienvenido, <span className="font-semibold text-amber-600">Super Admin</span>. Visión global del sistema.
          </p>
        </div>
        <div className="flex gap-3">
            <Link href="/admin/logs" className={buttonVariants({ variant: "outline" })}>
                <Server className="mr-2 h-4 w-4" />
                System Logs
            </Link>
            <Link href="/admin/settings" className={buttonVariants({ variant: "primary" })}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Global Settings
            </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total MRR (Real)</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">${mrr.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-slate-400" />
              Basado en {activeCount} suscripciones
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Tenants Activos</CardTitle>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{activeCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              De {tenantsCount} totales registrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{usersCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              +{createdThisMonth} nuevos este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-8 md:grid-cols-3">
        
        {/* Tenants List (Left - Wider) */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
             <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Tenants Recientes</CardTitle>
                    <CardDescription>Últimas organizaciones registradas en la plataforma.</CardDescription>
                </div>
                <Link href="/admin/tenants" className={buttonVariants({ variant: "ghost", size: "sm" })}>Ver todos</Link>
             </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organización</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                {tenant.name?.[0]?.toUpperCase() || "T"}
                            </div>
                            <div className="flex flex-col">
                                <span>{tenant.name || "Sin Nombre"}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{tenant.slug || tenant.public_slug || "No slug"}</span>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary" className="text-xs">
                            {tenant.plan || 'Free'}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                          tenant.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                          tenant.status === 'suspended' ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-slate-50 text-slate-700 border-slate-200"
                      }>
                        {tenant.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                        {new Date(tenant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
                             <a 
                                href={`http://${tenant.public_slug || tenant.slug}.localhost:3000`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="Sitio Público"
                                className={buttonVariants({ variant: "ghost", size: "icon" })}
                             >
                                <Globe className="h-4 w-4 text-slate-400 hover:text-slate-600"/>
                             </a>
                             <a 
                                href={`http://${tenant.public_slug || tenant.slug}.localhost:3000/calendar`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="Dashboard Admin"
                                className={buttonVariants({ variant: "ghost", size: "icon" })}
                             >
                                <LayoutDashboard className="h-4 w-4 text-slate-400 hover:text-blue-500"/>
                             </a>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {recentTenants.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-slate-500">
                            No se encontraron tenants.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Actions & Notifications (Right - Narrower) */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Link href="/admin/tenants" className={cn(buttonVariants({ variant: "secondary" }), "w-full justify-start")}>
                        <Building2 className="mr-2 h-4 w-4" /> Ver/Crear Tenants
                    </Link>
                    <Link href="/admin/users" className={cn(buttonVariants({ variant: "secondary" }), "w-full justify-start")}>
                        <Users className="mr-2 h-4 w-4" /> Gestionar Usuarios Globales
                    </Link>
                    <Button variant="secondary" className="w-full justify-start" disabled title="Próximamente">
                        <CreditCard className="mr-2 h-4 w-4" /> Configurar Planes
                    </Button>
                </CardContent>
            </Card>

            {/* Admin Notes Component */}
            <AdminNotes initialContent={adminNote} />
        </div>

      </div>
    </div>
  );
}
