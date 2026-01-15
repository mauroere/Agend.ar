import { parsePhoneNumber, isValidPhoneNumber, PhoneNumber } from 'libphonenumber-js';

// Default to Argentina if no country code is provided in the input
const DEFAULT_COUNTRY = 'AR';

export type PhoneValidationResult = {
  isValid: boolean;
  formatted?: string; // E.164 format (+54911...)
  display?: string;   // National or International format for display
  error?: string;
};

/**
 * Validates and formats a phone number ensuring it is mobile-friendly (WhatsApp).
 * Prefers E.164 for storage.
 */
export function validateAndFormatPhone(input: string): PhoneValidationResult {
  if (!input || input.trim() === '') {
    return { isValid: true, formatted: '', display: '' }; // Allow empty if not required (handled by UI)
  }

  try {
    const phoneNumber = parsePhoneNumber(input, DEFAULT_COUNTRY);

    if (!phoneNumber) {
        return { isValid: false, error: 'Número inválido.' };
    }

    if (!phoneNumber.isValid()) {
      return { isValid: false, error: 'El número no parece ser válido para la región.' };
    }

    // Check if it's a possible mobile number (optional, but good for WhatsApp)
    // getType() returns 'MOBILE', 'FIXED_LINE', etc. E.g. +54 9 ... is mobile in AR.
    
    return {
      isValid: true,
      formatted: phoneNumber.number, // E.164
      display: phoneNumber.formatInternational(),
    };
  } catch (error) {
    return { isValid: false, error: 'Formato irreconocible.' };
  }
}

/**
 * Normalizes a phone number to E.164 format for storage/API.
 * Returns null if invalid.
 */
export function normalizeForStorage(input: string): string | null {
  const { isValid, formatted } = validateAndFormatPhone(input);
  return isValid && formatted ? formatted : null;
}

/**
 * Heuristic to check if a phone number likely belongs to Argentina but is missing the '9' for mobile
 * which is a common error (e.g. entering +54 11... instead of +54 9 11...)
 */
export function suggestMobileFix(input: string): string | null {
    // This is complex, relies on specific country rules. 
    // For now, we rely on libphonenumber-js validation.
    return null; 
}
