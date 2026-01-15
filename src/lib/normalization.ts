import { normalizeForStorage } from "./phone-utils";

/**
 * Normalizes a phone number to E.164 format.
 * Uses libphonenumber-js via validateAndFormatPhone.
 * 
 * Replaces previous regex logic.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  const normalized = normalizeForStorage(phone);
  return normalized || phone; // Return original if fails (fallback behavior)
}
