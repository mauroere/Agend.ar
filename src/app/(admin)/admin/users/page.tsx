import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Database } from "@/types/database";
import { serviceClient } from "@/lib/supabase/service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Search, ChevronLeft, User, Stethoscope, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { PasswordResetDialog } from "./password-reset-dialog";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Profile {
  id: string;
  email: string;
  name?: string;
  role?: string;
  created_at?: string;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string };
}) {
  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (!serviceClient) {
    return (
      <div className="p-8 text-red-500">
        Error crítico: Service Client no está configurado. Revisa las variables de entorno.
      </div>
    );
  }

  // Auth check
  const { data: userProfile } = await serviceClient
    .from("agenda_users")
    .select("is_platform_admin")
    .eq("id", session.user.id)
    .single();

  if (!userProfile?.is_platform_admin) {
    redirect("/");
  }

  const query = searchParams.q || "";
  const roleFilter = searchParams.role || "all";
  
  // Query profiles with optional role filtering
  let dbQuery = serviceClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
    
  if (query) {
      dbQuery = dbQuery.ilike("email", `%${query}%`);
  }
  
  if (roleFilter !== "all") {
    dbQuery = dbQuery.eq("role", roleFilter);
  }

  const { data: profilesResult, error } = await dbQuery;

  if (error) {
    return <div className="p-8 text-red-500">Error cargando usuarios: {error.message}</div>;
  }

  const profiles = (profilesResult || []) as unknown as Profile[];

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
            href="/admin" 
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
            <ChevronLeft className="h-6 w-6 text-slate-500" />
        </Link>
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestión Global de Usuarios</h1>
            <p className="text-slate-500">Directorio completo de usuarios registrados en la plataforma.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <CardTitle>Usuarios ({profiles?.length ?? 0})</CardTitle>
                
                <div className="flex items-center bg-slate-100 p-1 rounded-md">
                    <Link href="/admin/users?role=all" className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-sm transition-all",
                        roleFilter === 'all' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                    )}>
                        Todos
                    </Link>
                    <Link href="/admin/users?role=admin" className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-sm transition-all",
                        roleFilter === 'admin' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                    )}>
                        Admins
                    </Link>
                    <Link href="/admin/users?role=professional" className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-sm transition-all",
                        roleFilter === 'professional' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                    )}>
                        Profesionales
                    </Link>
                    <Link href="/admin/users?role=patient" className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-sm transition-all",
                        roleFilter === 'patient' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                    )}>
                        Pacientes
                    </Link>
                </div>
              </div>

              <form className="flex gap-2 w-full md:w-auto">
                 <div className="relative w-full md:w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input 
                        name="q" 
                        placeholder="Buscar por email, nombre..." 
                        className="pl-9"
                        defaultValue={query}
                    />
                    <input type="hidden" name="role" value={roleFilter} />
                 </div>
                 <Button type="submit">Buscar</Button>
              </form>
           </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Identidad</TableHead>
                        <TableHead>Tipo de Usuario</TableHead>
                        <TableHead>Fecha Registro</TableHead>
                        <TableHead className="text-right">Seguridad</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {profiles?.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium text-slate-900 flex items-center gap-2">
                                        {user.email}
                                        {user.id === session.user.id && (
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">TÚ</Badge>
                                        )}
                                    </span>
                                    <span className="text-xs text-slate-500">{user.name || "Sin nombre"}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {user.role === 'admin' && <ShieldAlert className="h-4 w-4 text-red-500" />}
                                    {user.role === 'professional' && <Stethoscope className="h-4 w-4 text-blue-500" />}
                                    {user.role === 'patient' && <User className="h-4 w-4 text-slate-400" />}
                                    
                                    <Badge variant={
                                        user.role === 'admin' ? 'default' : 
                                        user.role === 'professional' ? 'secondary' : 'outline'
                                    } className={
                                        user.role === 'admin' ? 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200' :
                                        user.role === 'professional' ? 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200' : 
                                        'text-slate-500'
                                    }>
                                        {user.role === 'admin' ? 'Super Admin' : 
                                         user.role === 'professional' ? 'Profesional' : 'Paciente final'}
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell className="text-slate-500">
                                {new Date(user.created_at || "").toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </TableCell>
                            <TableCell className="text-right">
                                <PasswordResetDialog userId={user.id} userEmail={user.email || "Usuario sin email"} />
                            </TableCell>
                        </TableRow>
                    ))}
                     {(!profiles || profiles.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <User className="h-8 w-8 text-slate-200" />
                                    <p>No se encontraron usuarios con este filtro.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                     )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
