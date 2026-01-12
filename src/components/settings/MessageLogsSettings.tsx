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
                    {log.direction === "in" ? "Recibido" : "Enviado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={
                     log.status === 'failed' ? 'destructive' : 
                     log.status === 'read' ? 'outline' : 
                     'secondary'
                  }>
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[300px] truncate text-xs font-mono">
                    {/* Extract text from payload if possible */}
                    {JSON.stringify(log.payload_json).slice(0, 50)}...
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
