# Test plan E2E

1. **Crear turno → WhatsApp confirmación**
   - Desde `/calendar` abrir modal `+ Turno`, completar datos reales.
   - Verificar en Supabase que el registro aparece como `pending` y que `message_log` insertó template `appointment_created`.
   - Confirmar que el mensaje llega al teléfono sandbox.
2. **Responder `1` → estado confirmado**
   - Desde el teléfono responder `1`.
   - Revisar webhook logs (Supabase `message_log`) y estado `appointments.status = confirmed`.
   - UI en `/today` debe actualizar badge a `Confirmado`.
3. **Responder `2` → recibir slots y mover turno**
   - Responder `2`.
   - Chequear mensaje con opciones A/B/C.
   - En Supabase ajustar `start_at` manualmente simulando aceptación y validar que UI muestra nuevo horario.
4. **Responder `3` → cancelación + waitlist**
   - Responder `3`.
   - Confirmar estado `canceled` y que el cron `waitlist` envía template `waitlist_offer` a pacientes `waitlist.active = true`.
5. **Responder `STOP` → opt-out**
   - Responder `STOP`.
   - Verificar `patients.opt_out = true` y que siguientes jobs ignoran a ese paciente.
6. **Recordatorios no duplicados**
   - Ejecutar manualmente los endpoints `/api/cron/reminders-24h` y `/api/cron/reminders-2h` dos veces seguidas.
   - Revisar que la consulta filtra por ventana de tiempo y no vuelve a insertar `message_log` para el mismo `appointment_id` en la misma hora.
7. **Webhook verification security**
   - Enviar request con token inválido al GET `/api/webhooks/whatsapp` → esperar 403.
   - POST sin contenido válido → respuesta 200 pero sin side effects.
