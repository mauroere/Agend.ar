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
	notes?: string;
};

type LocationOption = { id: string; name: string };

type CalendarPageClientProps = {
	appointments: CalendarAppointment[];
	locations: LocationOption[];
};

export function CalendarPageClient({ appointments, locations }: CalendarPageClientProps) {
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
