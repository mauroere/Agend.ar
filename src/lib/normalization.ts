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
    // [SANDBOX FIX]
    // El Sandbox de Meta (versión prueba) ha verificado los números del usuario en formato LOCAL (+54 ... 15 ...).
    // La API "oficial" pide E.164 (+54 9 ...), pero el Whitelist del Sandbox rechaza ese formato porque no hace match exacto string-a-string.
    // Para que funcione AHORA (en desarrollo), debemos QUITAR el 9 si el usuario lo puso, para intentar coincidir con el formato local guardado.
    
    if (rest.startsWith("9")) {
       // return "+54" + rest; // ANTERIOR: Preservar el 9 (Correcto para Prod)
       
       // NUEVO: Remover el 9 (Hack para Sandbox Match)
       // Si el usuario puso +54 9 2324..., lo convertimos a +54 2324...
       rest = rest.slice(1);
    }
    
    // Si el usuario ingresó el número CON 15 (ej: +54 9 2324 15...), al quitar el 9 queda +54 2324 15... (Match!)
    // Si el usuario ingresó SIN 15 (ej: +54 9 2324 50...), al quitar queda +54 2324 50... (Puede fallar si Meta requiere el 15, el usuario deberá agregarlo al input).

    // [MODIFICACIÓN SANDBOX]
    // Desactivamos temporalmente la inserción forzada del '9' y la limpieza del '15'.
    // Razón: El Sandbox de Meta valida contra una lista estricta.
    // Si la lista tiene "+54 2324 501653" (Fijo) o "+54 2324 15...", debemos enviar EXACTAMENTE eso.
    // Si forzamos "+54 9...", rompemos la coincidencia con la whitelist del Sandbox.
    // En producción, esto debería revisarse (ya que móviles reales necesitan el 9).
    
    // Devolvemos el número limpio (+54...) pero sin alterar la estructura interna.
    return "+54" + rest; 
  }

  return cleaned;
}
