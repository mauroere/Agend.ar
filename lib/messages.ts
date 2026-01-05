export const TEMPLATE_NAMES = {
  appointmentCreated: "appointment_created",
  reminder24h: "reminder_24h",
  reminder2h: "reminder_2h",
  waitlistOffer: "waitlist_offer",
} as const;

export type TemplateRunContext = {
  patientName: string;
  date: string;
  time: string;
  location: string;
};

export const templatePreview = {
  [TEMPLATE_NAMES.appointmentCreated]:
    "Hola {{1}}, agendamos tu turno para {{2}} a las {{3}} en {{4}}. Respondé 1 Confirmar · 2 Reprogramar · 3 Cancelar · STOP para salir.",
  [TEMPLATE_NAMES.reminder24h]:
    "Recordatorio {{1}} mañana {{2}}. Respondé 1 Confirmar · 2 Reprogramar · 3 Cancelar · STOP.",
  [TEMPLATE_NAMES.reminder2h]:
    "Nos vemos hoy {{1}} a las {{2}}. Si necesitás moverlo respondé 2, cancelar 3.",
  [TEMPLATE_NAMES.waitlistOffer]:
    "Se liberó un turno {{1}} a las {{2}}. Respondé SI para tomarlo o STOP para salir.",
};
