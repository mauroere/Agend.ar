"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

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

export function AppointmentModal({
	onSubmit,
}: {
	onSubmit: (payload: FormValues) => Promise<void> | void;
}) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<FormValues>(INITIAL_FORM);
	const [loading, setLoading] = useState(false);

	const handleChange = (
		key: keyof FormValues,
		value: string | number,
	) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setLoading(true);
		try {
			await onSubmit(form);
			setForm(INITIAL_FORM);
			setOpen(false);
		} finally {
			setLoading(false);
		}
	};

	if (!open) {
		return (
			<Button onClick={() => setOpen(true)} aria-expanded={open}>
				+ Turno
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
					<h3 className="text-xl font-semibold">Nuevo turno</h3>
					<button type="button" onClick={() => setOpen(false)} className="text-slate-400">
						✕
					</button>
				</div>
				<div className="mt-4 space-y-4">
					<div>
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
					<Button type="submit" disabled={loading}>
						Guardar y confirmar
					</Button>
				</div>
			</form>
		</div>
	);
}
