"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreatePatientDialog, PatientDialog } from "./CreatePatientDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, Phone, Calendar, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

export type Patient = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  nextAppointment: string | null;
  noShowCount: number;
  optOut: boolean;
  notes: string | null;
};

export function PatientTable({ data }: { data: Patient[] }) {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [rows, setRows] = useState(data);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setRows(data);
  }, [data]);

  const adaptPatient = (record: any, fallback?: Patient): Patient => {
    const resolvedOptOut =
      typeof record.opt_out === "boolean"
        ? record.opt_out
        : typeof fallback?.optOut === "boolean"
          ? fallback.optOut
          : false;

    const resolvedNotes =
      typeof record.notes === "string"
        ? record.notes
        : record.notes === null
          ? null
          : fallback?.notes ?? null;

    return {
      id: record.id,
      fullName: record.full_name,
      phone: record.phone_e164,
      email: record.email || null,
      optOut: resolvedOptOut,
      notes: resolvedNotes,
      nextAppointment: fallback?.nextAppointment ?? null,
      noShowCount: fallback?.noShowCount ?? 0,
    };
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((patient) => {
      // Normalizar búsqueda para ignorar formato en teléfonos
      const rawPhone = patient.phone.replace(/\D/g, "");
      const searchPhone = q.replace(/\D/g, "");
      
      const matchName = patient.fullName.toLowerCase().includes(q);
      const matchEmail = patient.email?.toLowerCase().includes(q) ?? false;
      // Si el usuario escribe números, intentar coincidir con el teléfono limpio
      const matchPhone = searchPhone.length > 2 
        ? rawPhone.includes(searchPhone) 
        : patient.phone.includes(q);

      return matchName || matchPhone || matchEmail;
    });
  }, [rows, query]);

  const handleCreateSuccess = (record: any) => {
    setRows((prev) => [...prev, adaptPatient(record)]);
    toast({ title: "Paciente creado", description: "La ficha se agregó a la base." });
    setShowCreate(false);
  };

  const handleUpdateSuccess = (record: any, fallback: Patient) => {
    const mapped = adaptPatient(record, fallback);
    setRows((prev) => prev.map((p) => (p.id === mapped.id ? { ...p, ...mapped } : p)));
    toast({ title: "Paciente actualizado", description: "Los datos fueron guardados." });
    setEditingPatient(null);
  };

  async function handleDelete(patient: Patient) {
    if (!window.confirm(`¿Eliminar a ${patient.fullName}? Esta acción es permanente.`)) {
      return;
    }

    setActionId(patient.id);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo eliminar");
      }
      setRows((prev) => prev.filter((p) => p.id !== patient.id));
      toast({ title: "Paciente eliminado" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle>Base de Pacientes</CardTitle>
          <CardDescription>Visualiza y gestiona la información de tus pacientes por sede.</CardDescription>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o teléfono..."
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            />
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Nuevo
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {showCreate && (
          <CreatePatientDialog
            onClose={() => setShowCreate(false)}
            onSuccess={(record) => {
              handleCreateSuccess(record);
              router.refresh();
            }}
          />
        )}
        {editingPatient && (
          <PatientDialog
            mode="edit"
            patientId={editingPatient.id}
            defaultValues={{
              fullName: editingPatient.fullName,
              phone: editingPatient.phone,
              email: editingPatient.email || undefined,
              notes: editingPatient.notes,
              optOut: editingPatient.optOut,
            }}
            onClose={() => setEditingPatient(null)}
            onSuccess={(record) => {
              handleUpdateSuccess(record, editingPatient);
              router.refresh();
            }}
          />
        )}
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Próximo Turno</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-xs">
                        {patient.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      {patient.fullName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-2 text-slate-600">
                         <Phone className="h-3 w-3" />
                         {patient.phone}
                       </div>
                       {patient.email ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="truncate max-w-[150px]">{patient.email}</span>
                        </div>
                       ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {patient.nextAppointment ? (
                      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit text-xs font-medium">
                        <Calendar className="h-3 w-3" />
                        {patient.nextAppointment}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Sin turno agendado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {patient.optOut && (
                        <Badge variant="canceled">Opt-Out</Badge>
                      )}
                      {patient.noShowCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                          <AlertCircle className="h-3 w-3" /> {patient.noShowCount} No-Show
                        </div>
                      )}
                      {!patient.optOut && patient.noShowCount === 0 && (
                        <span className="text-slate-500 text-xs">Activo</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPatient(patient)}
                      >
                        <Pencil className="mr-1 h-4 w-4" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(patient)}
                        disabled={actionId === patient.id}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        {actionId === patient.id ? "Eliminando" : "Eliminar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    No se encontraron pacientes que coincidan con tu búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
