"use client";

import { useState }
from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type MessageLog = {
  id: string;
  created_at: string;
  direction: string;
  type: string | null;
  status: string;
  payload_json: any;
  patient: {
    full_name: string;
    phone_e164: string;
  } | null;
};

const statusMap: Record<string, string> = {
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "Falló",
  received: "Recibido"
};

const getStatusLabel = (status: string) => statusMap[status] || status;

export function MessageLogsSettings() {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    const supabase = getBrowserSupabase();
    
    // Join with patients (manual fetch or foreign key if configured, but simplified here)
    // We'll fetch logs first
    const { data, error } = await supabase
      .from("agenda_message_log")
      .select(`
        id,
        created_at,
        direction,
        type,
        status,
        payload_json,
        patient_id
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch patient names manually to avoid complex joins if relations aren't perfect
    const patientIds = Array.from(new Set((data || []).map((l: any) => l.patient_id)));
    const { data: patients } = await supabase
      .from("agenda_patients")
      .select("id, full_name, phone_e164")
      .in("id", patientIds);
    
    const patientMap = new Map((patients || []).map((p: any) => [p.id, p]));

    const enrichedLogs: MessageLog[] = (data || []).map((log: any) => ({
      ...log,
      patient: patientMap.get(log.patient_id) ?? null,
    }));

    setLogs(enrichedLogs);
    setLoading(false);
    setLoaded(true);
  };

  // Initial load
  if (!loaded && !loading) {
    fetchLogs();
  }


  const renderContent = (log: MessageLog) => {
    if (!log.payload_json) return <span className="text-muted-foreground italic">Sin contenido</span>;
    
    // Inbound text messages
    if (log.direction === 'in' && log.payload_json.text?.body) {
        return <span>{log.payload_json.text.body}</span>;
    }

    // Outbound Template messages
    if (log.payload_json.template) {
        return (
            <div className="flex flex-col gap-1">
                <span className="font-semibold text-xs text-blue-600 dark:text-blue-400">
                    {log.payload_json.template}
                </span>
                {Array.isArray(log.payload_json.variables) && (
                    <span className="text-muted-foreground">
                        Vars: {log.payload_json.variables.join(", ")}
                    </span>
                )}
            </div>
        );
    }

    // Fallback JSON dump for debugging
    return <span>{JSON.stringify(log.payload_json).slice(0, 50)}</span>;
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col space-y-1.5">
          <CardTitle>Historial de Mensajes</CardTitle>
          <CardDescription>Últimos 50 mensajes enviados y recibidos.</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Sentido</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Contenido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(log.created_at), "dd/MM HH:mm")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{log.patient?.full_name ?? "Desconocido"}</span>
                    <span className="text-xs text-muted-foreground">{log.patient?.phone_e164}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={log.direction === "in" ? "secondary" : "default"}>
                    {log.direction === "in" ? "Entrante" : "Saliente"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={
                     log.status === 'failed' ? 'destructive' : 
                     log.status === 'read' ? 'outline' : 
                     'secondary'
                  }>
                    {getStatusLabel(log.status)}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[300px] truncate text-xs">
                    {renderContent(log)}
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay mensajes registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
