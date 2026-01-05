"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AppointmentStatus } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type LocationOption = { id: string; name: string };
type AppointmentData = {
	id: string;
	patient: string;
	phone: string;
	start: Date;
	durationMinutes: number;
	service?: string;
	notes?: string;
	locationId?: string;
	status: AppointmentStatus;
};

type FormValues = {
	patient: string;
	phone: string;
	start: string;
	duration: number;
	service: string;
	notes: string;
};

const INITIAL_FORM: FormValues = {
	patient: "",
	phone: "",
	start: "",
	duration: 30,
	service: "Consulta",
	notes: "",
};

const isValidE164 = (value: string) => /^\+?[1-9]\d{7,14}$/.test(value.trim());

type AppointmentModalProps = {
	locations: LocationOption[];
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	appointment?: AppointmentData;
};

export function AppointmentModal({ locations, open: controlledOpen, onOpenChange, appointment }: AppointmentModalProps) {
	const isControlled = controlledOpen !== undefined;
	const [internalOpen, setInternalOpen] = useState(controlledOpen ?? false);
	const open = isControlled ? controlledOpen : internalOpen;

	useEffect(() => {
		if (isControlled) {
			setInternalOpen(controlledOpen ?? false);
		}
	}, [controlledOpen, isControlled]);

	const setOpen = (value: boolean) => {
		if (!isControlled) {
			setInternalOpen(value);
		}
		onOpenChange?.(value);
	};
	const [form, setForm] = useState<FormValues>(INITIAL_FORM);
	const [locationId, setLocationId] = useState<string>(locations[0]?.id ?? "");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const hasLocations = locations.length > 0;
	const router = useRouter();
	const isEdit = Boolean(appointment);

	useEffect(() => {
		if (appointment) {
			setForm({
				patient: appointment.patient,
				phone: appointment.phone,
				start: format(appointment.start, "yyyy-MM-dd'T'HH:mm"),
				duration: appointment.durationMinutes,
				service: appointment.service || "Consulta",
				notes: appointment.notes || "",
			});
			setLocationId(appointment.locationId ?? locations[0]?.id ?? "");
		} else {
			setForm(INITIAL_FORM);
			setLocationId(locations[0]?.id ?? "");
		}
		setError(null);
	}, [appointment, locations]);

	const handleChange = (
		key: keyof FormValues,
		value: string | number,
	) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!hasLocations) {
			setError("Primero crea una ubicación en Configuración");
			return;
		}
		if (!isValidE164(form.phone)) {
			setError("Teléfono debe estar en formato E.164 (+549...) y sin espacios");
			return;
		}
		if (!form.start) {
			setError("Ingresá fecha y hora");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const endpoint = appointment ? `/api/appointments/${appointment.id}` : "/api/appointments";
			const method = appointment ? "PATCH" : "POST";
			const response = await fetch(endpoint, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...form, location_id: locationId }),
			});
			const result = await response.json();
			if (!response.ok) {
				setError(result.error ?? (isEdit ? "No se pudo actualizar el turno" : "No se pudo crear el turno"));
				return;
			}
			setForm(INITIAL_FORM);
			setLocationId(locations[0]?.id ?? "");
			setOpen(false);
			router.refresh();
		} catch (e) {
			setError("Error inesperado. Intentá nuevamente.");
		} finally {
			setLoading(false);
		}
	};

	if (!open) {
		// When controlled from parent, don't render a trigger button to avoid duplicates
		if (controlledOpen !== undefined) {
			return null;
		}
		return (
			<Button onClick={() => setOpen(true)} aria-expanded={open}>
				{appointment ? "Editar turno" : "+ Turno"}
			</Button>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
			>
				<div className="flex items-center justify-between">
					<h3 className="text-xl font-semibold">{appointment ? "Editar turno" : "Nuevo turno"}</h3>
					<button type="button" onClick={() => setOpen(false)} className="text-slate-400">
						✕
					</button>
				</div>
				<div className="mt-4 space-y-4">
					<div>
					{error && <p className="text-sm text-red-600">{error}</p>}
						<label className="text-sm text-slate-500">Paciente</label>
						<Input
							required
							value={form.patient}
							onChange={(event) => handleChange("patient", event.target.value)}
							placeholder="Nombre o teléfono"
						/>
					</div>
					<div>
						<label className="text-sm text-slate-500">Teléfono (E.164)</label>
						<Input
							required
							value={form.phone}
							onChange={(event) => handleChange("phone", event.target.value)}
							placeholder="+54911..."
						/>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<label className="text-sm text-slate-500">Sede</label>
							<Select value={locationId} onChange={(event) => setLocationId(event.target.value)} disabled={!hasLocations}>
								{locations.map((loc) => (
									<option key={loc.id} value={loc.id}>
										{loc.name}
									</option>
								))}
							</Select>
						</div>
						<div>
							<label className="text-sm text-slate-500">Fecha y hora</label>
							<Input
								required
								type="datetime-local"
								value={form.start}
								onChange={(event) => handleChange("start", event.target.value)}
							/>
						</div>
						<div>
							<label className="text-sm text-slate-500">Duración (min)</label>
							<Input
								required
								type="number"
								value={form.duration}
								onChange={(event) => handleChange("duration", Number(event.target.value))}
							/>
						</div>
					</div>
					<div>
						<label className="text-sm text-slate-500">Servicio</label>
						<Select
							value={form.service}
							onChange={(event) => handleChange("service", event.target.value)}
						>
							<option value="Consulta">Consulta</option>
							<option value="Control">Control</option>
							<option value="Sesión">Sesión</option>
						</Select>
					</div>
					<div>
						<label className="text-sm text-slate-500">Notas internas</label>
						<textarea
							className="h-20 w-full rounded-lg border border-slate-200 p-3 text-sm"
							value={form.notes}
							onChange={(event) => handleChange("notes", event.target.value)}
						/>
					</div>
				</div>
				<div className="mt-6 flex justify-end gap-3">
					<Button type="button" variant="ghost" onClick={() => setOpen(false)}>
						Cancelar
					</Button>
					<Button type="submit" disabled={loading || !hasLocations}>
						{isEdit ? "Guardar cambios" : "Guardar y confirmar"}
					</Button>
				</div>
			</form>
		</div>
	);
}
