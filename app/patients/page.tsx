import { Shell } from "@/components/layout/Shell";
import { PatientTable } from "@/components/patients/PatientTable";
import { mockPatients } from "@/lib/mock";

export default function PatientsPage() {
  return (
    <Shell>
      <PatientTable data={mockPatients} />
    </Shell>
  );
}
