"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppointmentStatus } from "@/lib/constants";
import { AppointmentModal } from "./AppointmentModal";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { ConsultationModal } from "@/components/medical/ConsultationModal";
import { useToast } from "@/components/ui/use-toast";

type CalendarAppointment = {
	id: string;
	start: Date;
	durationMinutes: number;
	patient: string;
	status: AppointmentStatus;
	phone: string;
	locationId?: string;
	service?: string;
	serviceId?: string;
	providerId?: string;
	notes?: string;
};

type LocationOption = { id: string; name: string };

type ServiceOption = {
	id: string;
	name: string;
	description: string | null;
	duration_minutes: number;
	price_minor_units: number | null;
	currency: string;
	color: string | null;
};

type ProviderOption = {
	id: string;
	full_name: string;
	bio: string | null;
	avatar_url: string | null;
	color: string | null;
	default_location_id: string | null;
  serviceIds?: string[];
};

type CalendarPageClientProps = {
	appointments: CalendarAppointment[];
	locations: LocationOption[];
  services: ServiceOption[];
  providers: ProviderOption[];
};

export function CalendarPageClient({ appointments, locations, services, providers }: CalendarPageClientProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [modalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState<CalendarAppointment | null>(null);

	const [attendOpen, setAttendOpen] = useState(false);
	const [appointmentToAttend, setAppointmentToAttend] = useState<CalendarAppointment | null>(null);

	const handleAttend = (appt: CalendarAppointment) => {
		setAppointmentToAttend(appt);
		setAttendOpen(true);
	};

	const handleConfirm = async (appt: CalendarAppointment) => {
		try {
			const response = await fetch(`/api/appointments/${appt.id}/confirm`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("No se pudo confirmar el turno");
			}

			toast({
				title: "Turno confirmado",
				description: `El turno de ${appt.patient} ha sido confirmado.`,
				className: "bg-emerald-50 border-emerald-200 text-emerald-800",
			});

			router.refresh();
		} catch (error) {
			toast({
				title: "Error",
				description: "Ocurrió un error al confirmar el turno.",
				variant: "destructive",
			});
		}
	};

	const handleCancel = async (appt: CalendarAppointment) => {
		if (!confirm(`¿Seguro que querés cancelar el turno de ${appt.patient}?`)) return;

		try {
			const response = await fetch(`/api/appointments/${appt.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					status: "canceled",
					cancellation_reason: "Cancelado desde la agenda por el profesional",
				}),
			});

			if (!response.ok) {
				throw new Error("No se pudo cancelar el turno");
			}

			toast({
				title: "Turno cancelado",
				description: `El turno de ${appt.patient} ha sido cancelado.`,
			});

			router.refresh();
		} catch (error) {
			toast({
				title: "Error",
				description: "Ocurrió un error al cancelar el turno.",
				variant: "destructive",
			});
		}
	};

	return (
		<>
			<WeeklyCalendar
				appointments={appointments}
				providers={providers}
				onCreate={() => {
					setSelected(null);
					setModalOpen(true);
				}}
				onSelect={(appt) => {
					setSelected(appt);
					setModalOpen(true);
				}}
				onAttend={handleAttend}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>
			<div className="fixed bottom-8 right-8">
				<AppointmentModal
					locations={locations}
					services={services}
					providers={providers}
					open={modalOpen}
					onOpenChange={(open) => {
						setModalOpen(open);
						if (!open) setSelected(null);
					}}
					appointment={selected ?? undefined}
				/>
			</div>

			{appointmentToAttend && (
				<ConsultationModal
					open={attendOpen}
					onOpenChange={(open) => {
						setAttendOpen(open);
						if (!open) setAppointmentToAttend(null);
					}}
					appointmentId={appointmentToAttend.id}
					patientName={appointmentToAttend.patient}
				/>
			)}
		</>
	);
}
