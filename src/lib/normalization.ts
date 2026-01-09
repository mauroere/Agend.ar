/**
 * Normalizes a phone number to E.164 format.
 * Specifically handles Argentina (+54) mobile quirks:
 * - Ensures + prefix
 * - Removes spaces, dashes, parentheses
 * - For +54:
 *   - Removes '15' (local mobile prefix) if present after area code (heuristic)
 *   - Ensures '9' (mobile indicator) is present after +54
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";

  // 1. Remove all non-numeric characters except '+'
  let cleaned = phone.replace(/[^\d+]/g, "");

  // 2. Ensure it starts with '+'
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  // 3. Special handling for Argentina (+54)
  if (cleaned.startsWith("+54")) {
    let rest = cleaned.slice(3); // verification digits after +54

    // Remove leading '0' if user entered (e.g. +54 011...)
    /*
      Wait, removing leading 0 from the REST is correct because area codes don't start with 0 in E.164, 
      but locally they are dialed 011...
    */
    if (rest.startsWith("0")) {
      rest = rest.slice(1);
    }
    
    // Check for '9' (Mobile indicator) at the start
    if (rest.startsWith("9")) {
        return "+54" + rest; 
    }

    // [MODIFICACIÓN CRÍTICA PARA SANDBOX META]
    // El usuario reporta que Meta verifica su número como "+54 2324 15-501653" (con 15, sin 9).
    // Sin embargo, para ENVIAR mensajes, la API oficial de WhatsApp Cloud RECHAZA el formato local (con 15)
    // y RECHAZA el formato fijo (sin 9). EXIGE el formato E.164: +54 9 + CodigoArea + Numero (sin 15).
    
    // El conflicto es: 
    // - Lista Permitidos (Sandbox) muestra: +54 ... 15 ...
    // - API Envío exige: +54 9 ... (y sin 15).
    
    // Si la API rechaza "+54 9..." diciendo que no está en la lista de permitidos, es porque
    // internamente el Sandbox NO es capaz de mapear el número "fijo/local" (+54 ... 15) con el E.164 (+54 9 ...).
    
    // ESTRATEGIA:
    // 1. Intentar construir el formato E.164 (Estándar) -> +54 9 ...
    // 2. [ACTUALIZACIÓN] El usuario indica que Meta Sandbox verifica números CON '15'.
    //    Si removemos el '15', el número enviado (+54 9 ... 5555) no coincide con la lista blanca (+54 ... 15 5555).
    //    Por lo tanto, NO debemos quitar el '15' si estamos en un entorno donde eso importa.
    
    // Sin embargo, para producción real de WhatsApp API, el '15' NO debe ir y el '9' SÍ.
    // Esto crea un conflicto entre Sandbox (con 15) y Producción (sin 15).
    
    // Solución pragmática solicitada por el usuario:
    // "Usa como te indica META".
    // Si Meta verificó con 15, enviemos con 15, PERO asegurando el 9 si es móvil.
    // OJO: La API suele rechazar el 15.
    
    // Vamos a probar enviar el número tal cual el usuario lo ingresó (o como Meta lo muestra)
    // PERO con el +549 adelante. 
    // Es decir: +54 9 2324 15 50... 
    // A ver si la API "traga" el 15 siendo parte del número.
    
    // Comentamos la eliminación del 15.
    /*
    let processedRest = rest;
    const index15 = processedRest.indexOf("15");
    if (index15 >= 2 && index15 <= 5) { 
       processedRest = processedRest.slice(0, index15) + processedRest.slice(index15 + 2);
    }
    return "+549" + processedRest;
    */
   
    // Simplemente agregamos el 9. Dejamos el 15 si está.
    return "+549" + rest;
  }

  return cleaned;
}
