# Agend.ar – Agenda + Autopiloto WhatsApp

Micro-SaaS multi-tenant para profesionales de salud. Next.js (App Router) + Supabase + WhatsApp Cloud API.

## Capas
- **App Router UI** (`src/app/`) con vistas `/calendar`, `/today`, `/patients`, `/settings`, `/login`.
- **Componentes** (`src/components/`) usando Tailwind + utilidades shadcn.
- **Jobs/Automations** (`src/app/api/cron/*`) consumidos por Vercel Cron para recordatorios T-24, T-2 y lista de espera.
- **Webhooks** (`src/app/api/webhooks/whatsapp`) manejan verification GET y mensajes entrantes.
- **Dominio** (`src/lib/`) contiene clientes Supabase/WhatsApp, scheduling helpers, constantes y jobs reutilizables.
- **Infra** (`supabase/`) define schema Postgres + seed multi-tenant + RLS.

## Flujo WhatsApp
1. Al crear turno se dispara template `appointment_created`.
2. Paciente responde `1/2/3` o `STOP`. Webhook actualiza estado y vuelve a escribir logs/confirmaciones.
3. Cron job 24h/2h envía recordatorios usando templates `reminder_24h` y `reminder_2h` solo a `confirmed`.
4. Cancelaciones dentro de 48h activan job `waitlist` que notifica `waitlist_offer`.

## Variables de entorno
Ver `.env.example` y `DEPLOY.md` para detalles.
