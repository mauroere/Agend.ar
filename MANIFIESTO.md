# Manifiesto del MVP

Documento que resume las reglas clave entregadas por el cliente.

- Producto: micro-SaaS Agenda + Autopiloto anti no-show vía WhatsApp.
- Stack: Next.js (App Router) en Vercel + Supabase (Postgres/Auth/Storage) + Tailwind/shadcn + WhatsApp Cloud API + Vercel Cron.
- Multi-tenant desde el día 1 con RLS estricto.
- Funcionalidad: calendario semanal/diario, inbox operativo de hoy, base de pacientes, automatización configurable, gestión de sedes y equipo.
- Flujo WhatsApp: confirmación inmediata, recordatorios T-24/T-2, reprogramación con 3 slots, cancelación que dispara lista de espera, opt-out STOP.
- Scheduler: 3 jobs cada 5 min (reminder 24h, reminder 2h, waitlist), idempotentes y con locks.
- Webhook `/api/webhooks/whatsapp` con verificación GET y manejo de replies 1/2/3, STOP, lista de espera.
- Modelado Postgres: tenants, locations, users, patients, appointments, waitlist, message_templates, message_log, webhook_events.
- Copys templated en español rioplatense, tono pro.
- Timezone fija `America/Argentina/Buenos_Aires` y manejo E.164.
