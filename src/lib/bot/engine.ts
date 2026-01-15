import { BotSession, updateSession, clearSession, createSession, getSession, BotState } from "./session";
import { serviceClient } from "@/lib/supabase/service";
import { sendTextMessage } from "@/lib/whatsapp";
import { WhatsAppCredentials } from "@/server/whatsapp-config";
import { getAvailabilitySlots } from "@/server/availability/getSlots";
import { createAppointmentForTenant } from "@/server/appointments/createAppointment";
import { addDays, format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";

// --- Helpers ---
const normalizeInput = (text: string) => text.trim().toLowerCase();

async function send(to: string, text: string, creds: WhatsAppCredentials) {
  return await sendTextMessage({ to, text, credentials: creds });
}

// --- Steps Handlers ---

// 1. START / MENU
async function handleStart(session: BotSession, input: string, creds: WhatsAppCredentials) {
  const message = `👋 ¡Hola ${session.data.userName || ""}! Bienvenido al asistente virtual.

1️⃣ Nuevo Turno
2️⃣ Mis Turnos
3️⃣ Cancelar Turno
4️⃣ Hablar con una persona

Ingresá el número de la opción deseada.`;
  
  await send(session.phone_number, message, creds);
  await updateSession(session.tenant_id, session.phone_number, { step: "MENU" });
}

async function handleMenu(session: BotSession, input: string, creds: WhatsAppCredentials) {
  if (input === "1" || input.includes("nuevo") || input.includes("turno")) {
    if (!serviceClient) {
        await send(session.phone_number, "Servicio no disponible", creds);
        return;
    }
    // Fetch Services
    const { data: services } = await serviceClient
      .from("agenda_services")
      .select("id, name, price_minor_units")
      .eq("tenant_id", session.tenant_id)
      .eq("active", true)
      .order("name");

    if (!services || services.length === 0) {
      await send(session.phone_number, "Lo siento, no tenemos servicios activos disponibles por este medio.", creds);
      return;
    }

    let msg = "🏢 *Elegí el servicio:*\n";
    services.forEach((s, i) => {
      msg += `*${i + 1}.* ${s.name} ${s.price_minor_units ? `($${s.price_minor_units/100})` : ""}\n`;
    });
    
    // Store the mapping of index to ID in session data for next step
    const serviceOptions = services.reduce((acc, s, i) => ({ ...acc, [(i+1).toString()]: s }), {});
    
    await send(session.phone_number, msg, creds);
    await updateSession(session.tenant_id, session.phone_number, { 
      step: "SELECTING_SERVICE", 
      data: { serviceOptions } // Save options to avoid re-fetching mismatch
    });

  } else if (input === "2") {
    // TODO: List Appointments
    await send(session.phone_number, "🚧 Funcionalidad 'Mis Turnos' en desarrollo.", creds);
  } else if (input === "3") {
    // TODO: Cancel logic
    await send(session.phone_number, "🚧 Funcionalidad 'Cancelar' en desarrollo.", creds);
  } else if (input === "4") {
    await send(session.phone_number, "👥 Un agente se pondrá en contacto con vos pronto.", creds);
    await clearSession(session.tenant_id, session.phone_number);
  } else {
    await send(session.phone_number, "❌ Opción no válida. Por favor elegí 1, 2, 3 o 4.", creds);
  }
}

// 2. SERVICE SELECTION
async function handleSelectingService(session: BotSession, input: string, creds: WhatsAppCredentials) {
  const options = session.data.serviceOptions;
  const selected = options[input]; // input "1", "2"...

  if (!selected) {
    await send(session.phone_number, "❌ Opción incorrecta. Intentá de nuevo con el número del servicio.", creds);
    return;
  }

  // Ask for Date
  // We can offer: "Hoy", "Mañana" or exact date input.
  // For simplicity MVP: Ask to type date YYYY-MM-DD or simple formats?
  // Let's offer quick replies logic text.
  await send(session.phone_number, `🗓️ Elegiste *${selected.name}*. \n\nPor favor escribí la fecha que buscás en formato *DD/MM* (ej: 25/10) o escribí "Mañana".`, creds);
  
  await updateSession(session.tenant_id, session.phone_number, { 
    step: "SELECTING_DATE",
    data: { serviceId: selected.id, serviceName: selected.name, serviceOptions: null } // Clear options to save space
  });
}

// 3. DATE SELECTION & AVAILABILITY
async function handleSelectingDate(session: BotSession, input: string, creds: WhatsAppCredentials) {
  let targetDate = new Date();
  const lower = input.toLowerCase();

  if (lower.includes("hoy")) {
    // Keep today
  } else if (lower.includes("manana") || lower.includes("mañana")) {
    targetDate = addDays(new Date(), 1);
  } else {
    // Try parse DD/MM
    // We assume current year.
    const parsed = parse(input, "dd/MM", new Date());
    if (isValid(parsed)) {
      targetDate = parsed;
    } else {
        // Try YYYY-MM-DD
         const parsedIso = parse(input, "yyyy-MM-dd", new Date());
         if(isValid(parsedIso)) targetDate = parsedIso;
         else {
            await send(session.phone_number, "🤔 No entendí la fecha. Probá formato DD/MM (ej: 20/05) o decime 'Mañana'.", creds);
            return;
         }
    }
  }

  const dateStr = format(targetDate, "yyyy-MM-dd");
  
  // Fetch Slots
  await send(session.phone_number, `🔎 Buscando horarios para el ${format(targetDate, "dd/MM", { locale: es })}...`, creds);

  // Default duration/location fetch
  // This is a simplified version of what we did in the API route
  // We need to fetch basic duration from service or default
  const duration = 30; // Ideally fetch from serviceId stored in DB if not in session, but we stored serviceId.
  // Ideally, get location.
  if(!serviceClient) {
      await send(session.phone_number, "⚙️ Error: Sistema no disponible.", creds);
      return;
  }
  const { data: loc } = await serviceClient.from("agenda_locations").select("id").eq("tenant_id", session.tenant_id).limit(1).single();
  
  if(!loc) {
      await send(session.phone_number, "⚙️ Error: No hay consultorios configurados.", creds);
      return;
  }

/*
if (!serviceClient) {
        await send(session.phone_number, "Error: Servicio no disponible.", creds);
        return;
    }
*/

    try {
        const slots = await getAvailabilitySlots({
            db: serviceClient,
            tenantId: session.tenant_id,
            date: dateStr,
            locationId: loc.id,
            durationMinutes: duration,
            providerId: undefined
        });

        if (slots.length === 0) {
            await send(session.phone_number, "😔 No hay turnos disponibles para esa fecha. Probá escribiendo otra fecha.", creds);
            // Stay in SELECTING_DATE step
            return;
        }

        // Limit slots for display (first 10)
        const displaySlots = slots.slice(0, 15);
        let msg = `🕐 *Horarios disponibles (${format(targetDate, "dd/MM")}):*\n`;
        
        // We Map slots to a simple index
        const slotOptions: Record<string, string> = {};
        
        displaySlots.forEach((isoStart: string, i: number) => {
            const dateObj = new Date(isoStart);
            const timeLabel = format(dateObj, "HH:mm");
            msg += `${i + 1}. ${timeLabel}\n`;
            slotOptions[(i+1).toString()] = timeLabel;
        });

    msg += "\nEscribí el número del horario que preferís.";

    await send(session.phone_number, msg, creds);
    await updateSession(session.tenant_id, session.phone_number, { 
        step: "SELECTING_TIME",
        data: { date: dateStr, slotOptions } 
    });

  } catch (err) {
      console.error(err);
      await send(session.phone_number, "⚠️ Ocurrió un error consultando disponibilidad.", creds);
  }
}

// 4. CONFIRMATION
async function handleSelectingTime(session: BotSession, input: string, creds: WhatsAppCredentials) {
    const options = session.data.slotOptions;
    const selectedTime = options[input];

    if (!selectedTime) {
        await send(session.phone_number, "❌ Opción inválida. Elegí uno de los números de la lista.", creds);
        return;
    }

    // Summary
    const summary = `📝 *Confirmar Turno*
    
📅 Fecha: ${session.data.date}
🕐 Hora: ${selectedTime}
🩺 Servicio: ${session.data.serviceName}

Escribí *SI* para confirmar la reserva.`;

    await send(session.phone_number, summary, creds);
    await updateSession(session.tenant_id, session.phone_number, {
        step: "CONFIRMATION",
        data: { time: selectedTime }
    });
}

async function handleConfirmation(session: BotSession, input: string, creds: WhatsAppCredentials) {
    if (normalizeInput(input) !== "si") {
        await send(session.phone_number, "Reserva cancelada o no entendí. Escribí 'Hola' para empezar de nuevo.", creds);
        await clearSession(session.tenant_id, session.phone_number);
        return;
    }

    await send(session.phone_number, "⏳ Procesando tu reserva...", creds);

    try {
        if (!serviceClient) throw new Error("Service unavailable");
        const fullStartDate = `${session.data.date}T${session.data.time}:00`; // Naive ISO
        
        await createAppointmentForTenant({
            db: serviceClient as any,
            tenantId: session.tenant_id,
            input: {
                patient: session.data.userName || "WhatsApp User",
                phone: session.phone_number, // Already normalized?
                start: fullStartDate,
                serviceId: session.data.serviceId,
                notes: "Reserva automática vía Bot WhatsApp Nativo"
            },
            sendNotifications: true // Use regular system notifications (or we can skip and send custom here)
        });

        await send(session.phone_number, "✅ *¡Turno Agendado con éxito!* Te enviamos un mensaje con los detalles. \n\nGracias por confiar en nosotros.", creds);
        
    } catch(err: any) {
        console.error(err);
        await send(session.phone_number, `⚠️ Hubo un problema al guardar el turno: ${err.message}`, creds);
    } finally {
        await clearSession(session.tenant_id, session.phone_number);
    }
}


// --- Main Router ---

export async function processBotMessage(tenantId: string, phone: string, text: string, userName: string, creds: WhatsAppCredentials) {
    const session = await getSession(tenantId, phone);

    // Global Commands
    if (normalizeInput(text) === "salir" || normalizeInput(text) === "cancelar") {
        await send(phone, "🚫 Operación cancelada.", creds);
        await clearSession(tenantId, phone);
        return;
    }

    if (!session || normalizeInput(text) === "hola" || normalizeInput(text) === "menu") {
        // Start new session
        const newSession = await createSession(tenantId, phone, { userName });
        await handleStart(newSession, text, creds);
        return;
    }

    // State Machine
    switch (session.step) {
        case "START": // Should have been handled above, but just in case
        case "MENU":
            await handleMenu(session, text, creds);
            break;
        case "SELECTING_SERVICE":
            await handleSelectingService(session, text, creds);
            break;
        case "SELECTING_DATE":
            await handleSelectingDate(session, text, creds);
            break;
        case "SELECTING_TIME":
            await handleSelectingTime(session, text, creds);
            break;
        case "CONFIRMATION":
            await handleConfirmation(session, text, creds);
            break;
        default:
             await send(phone, "😵 Me perdí. Escribí 'Hola' para empezar de nuevo.", creds);
             await clearSession(tenantId, phone);
    }
}
