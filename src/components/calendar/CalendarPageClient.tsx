"use client";

import { useState } from "react";
import { AppointmentStatus } from "@/lib/constants";
import { AppointmentModal } from "./AppointmentModal";
import { WeeklyCalendar } from "./WeeklyCalendar";

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
	const [modalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState<CalendarAppointment | null>(null);

	return (
		<>
			<WeeklyCalendar
				appointments={appointments}
				onCreate={() => {
					setSelected(null);
					setModalOpen(true);
				}}
				onSelect={(appt) => {
					setSelected(appt);
					setModalOpen(true);
				}}
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
		</>
	);
}
