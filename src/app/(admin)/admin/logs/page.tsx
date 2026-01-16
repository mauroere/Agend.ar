import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Database } from "@/types/database";
import { serviceClient } from "@/lib/supabase/service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { AlertCircle, Info, AlertTriangle, ShieldAlert, ChevronLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PlatformLog {
    id: string;
    level: string;
    source: string;
    message: string;
    metadata: any;
    created_at: string;
}

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/admin/login");
  if (!serviceClient) return <div>Error: Service unavailable</div>;

  const { data: userProfile } = await serviceClient
    .from("agenda_users")
    .select("is_platform_admin")
    .eq("id", session.user.id)
    .single();

  if (!userProfile?.is_platform_admin) redirect("/");

  // Fetch Logs
  const { data: logsResult, error } = await serviceClient
    .from("platform_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const logs = (logsResult || []) as unknown as PlatformLog[];

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
       <div className="flex items-center gap-4">
            <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "icon" })}>
                <ChevronLeft className="h-6 w-6 text-slate-500" />
            </Link>
        <div>
            <h1 className="text-2xl font-bold text-slate-900">System Logs</h1>
            <p className="text-slate-500">Auditoría de eventos del sistema.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                 <CardTitle>Eventos Recientes</CardTitle>
                 <CardDescription>Mostrando los últimos 100 eventos del sistema.</CardDescription>
            </div>
            <Link href="/admin/logs" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refrescar
            </Link>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[150px]">Timestamp</TableHead>
                        <TableHead className="w-[100px]">Nivel</TableHead>
                        <TableHead className="w-[150px]">Origen</TableHead>
                        <TableHead>Mensaje</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs?.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs text-slate-500">
                                {new Date(log.created_at || "").toLocaleString()}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={cn(
                                    log.level === 'info' && "bg-blue-50 text-blue-700 border-blue-200",
                                    log.level === 'warn' && "bg-amber-50 text-amber-700 border-amber-200",
                                    log.level === 'error' && "bg-red-50 text-red-700 border-red-200",
                                    log.level === 'critical' && "bg-red-900 text-white border-red-900",
                                )}>
                                    {log.level === 'info' && <Info className="mr-1 h-3 w-3" />}
                                    {log.level === 'warn' && <AlertTriangle className="mr-1 h-3 w-3" />}
                                    {log.level === 'error' && <AlertCircle className="mr-1 h-3 w-3" />}
                                    {log.level === 'critical' && <ShieldAlert className="mr-1 h-3 w-3" />}
                                    {log.level.toUpperCase()}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-slate-700">
                                {log.source}
                            </TableCell>
                            <TableCell className="text-slate-600">
                                {log.message}
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                    <pre className="mt-1 text-[10px] bg-slate-100 p-1 rounded overflow-x-auto">
                                        {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                No hay logs registrados aún.
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
