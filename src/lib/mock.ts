import { AppointmentStatus } from "@/lib/constants";

export const mockAppointments = [
  {
    id: "appt_1",
    start: new Date(),
    durationMinutes: 30,
    patient: "María Pérez",
    status: "pending" as AppointmentStatus,
  },
  {
    id: "appt_2",
    start: new Date(Date.now() + 60 * 60 * 1000),
    durationMinutes: 60,
    patient: "Julián Díaz",
    status: "confirmed" as AppointmentStatus,
  },
];

export const mockToday = [
  {
    id: "t1",
    patient: "Lucía",
    time: "09:00",
    status: "pending" as const,
    action: "Reenviar",
  },
  {
    id: "t2",
    patient: "Ricardo",
    time: "10:30",
    status: "risk" as const,
    action: "Asignar",
  },
];

export const mockPatients = [
  {
    id: "p1",
    fullName: "María Pérez",
    phone: "+549111111111",
    nextAppointment: "03 Ene, 09:00",
    noShowCount: 0,
    optOut: false,
  },
  {
    id: "p2",
    fullName: "Julián Díaz",
    phone: "+549122222222",
    nextAppointment: "04 Ene, 11:00",
    noShowCount: 1,
    optOut: false,
  },
];
