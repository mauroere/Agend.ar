"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreatePatientDialog } from "./CreatePatientDialog";

export type Patient = {
  id: string;
  fullName: string;
  phone: string;
  nextAppointment: string | null;
  noShowCount: number;
  optOut: boolean;
};

export function PatientTable({ data }: { data: Patient[] }) {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const filtered = useMemo(() => {
    return data.filter((patient) =>
      `${patient.fullName} ${patient.phone}`.toLowerCase().includes(query.toLowerCase()),
    );
  }, [data, query]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Pacientes</h2>
          <p className="text-sm text-slate-500">Base única por sede</p>
        </div>
        <div className="flex gap-2">
          <Input
            className="w-64"
            placeholder="Buscar nombre o teléfono"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
          />
          <Button onClick={() => setShowCreate(true)}>Nuevo</Button>
        </div>
      </div>
      {showCreate && <CreatePatientDialog onClose={() => setShowCreate(false)} />}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="py-2">Paciente</th>
              <th>Teléfono</th>
              <th>Próximo turno</th>
              <th>No show</th>
              <th>Opt-out</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((patient) => (
              <tr key={patient.id} className="border-t border-slate-100">
                <td className="py-3 font-medium">{patient.fullName}</td>
                <td>{patient.phone}</td>
                <td>{patient.nextAppointment ?? "Sin turno"}</td>
                <td>{patient.noShowCount}</td>
                <td>{patient.optOut ? "STOP" : "OK"}</td>
                <td>
                  <Button size="sm" variant="outline">
                    Ver ficha
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
