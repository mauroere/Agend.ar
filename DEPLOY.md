# Deploy checklist

## Supabase
1. Crear proyecto en https://app.supabase.com (región Sao Paulo recomendado).
2. Ejecutar las migraciones (requiere `supabase` CLI linkeada al proyecto):
   ```bash
   npm run db:push
   ```
3. Backfill de `public_slug` y `custom_domain` default (idempotente, solo actualiza nulls):
   ```bash
   npm run db:seed-slugs
   ```
4. Crear bucket de Storage (desde Supabase → Storage) llamado `public-assets`, con acceso público. Este bucket guardará logos, imágenes y videos cargados desde el panel. Configurar la política pública según la documentación de Storage y setear la variable `NEXT_PUBLIC_UPLOAD_BUCKET=public-assets` (o el nombre que elijas).
5. Cargar seed inicial:
   ```bash
   supabase db remote commit --file supabase/seed.sql
   ```
6. Activar RLS (ya viene habilitado por migración).
7. Crear JWT custom claim `tenant_id` via auth hook o mediante triggers para cada usuario nuevo.

## Vercel
1. Crear proyecto conectado al repo.
2. Configurar variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - `WHATSAPP_VERIFY_TOKEN`
   - `CRON_SECRET`
3. Configurar Vercel Cron:
   - `*/5 * * * *` → `/api/cron/reminders-24h`
   - `*/5 * * * *` → `/api/cron/reminders-2h`
   - `*/5 * * * *` → `/api/cron/waitlist`
   Cada cron debe enviar header `x-cron-secret: $CRON_SECRET`.
4. Deploy `next build` (Node 18+).

## WhatsApp Cloud API
1. Crear app en developers.facebook.com → WhatsApp → Cloud API.
2. Configurar webhook URL `https://{vercel-app}/api/webhooks/whatsapp` y verify token.
3. Registrar templates (appointment_created, reminder_24h, reminder_2h, waitlist_offer) y esperar aprobación.
4. Guardar `phone_number_id` y `business_account_id` en Vercel env vars.
