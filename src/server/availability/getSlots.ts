import { addMinutes, format, isAfter, isBefore, startOfDay, addDays, parse } from "date-fns";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { isWithinBusinessHours } from "@/lib/scheduling";

// --- Types ---

export type AvailabilityConfig = {
  businessHours: Record<string, [string, string][]>;
  timeZone: string;
  bufferMinutes: number;
};

export type AvailabilityData = {
  appointments: Array<{
    start_at: string;
    end_at: string;
    provider_id: string | null;
    location_id: string;
  }>;
  blocks: Array<{
    start_at: string;
    end_at: string;
    provider_id: string | null;
    location_id: string | null;
  }>;
};

export class AvailabilityError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type AnySupabaseClient = SupabaseClient<Database, "public", any>;

// --- Core Helper Functions ---

/**
 * 1. Fetch Configuration (Location Settings + Provider Schedule Override)
 */
export async function fetchAvailabilityConfig(
  db: AnySupabaseClient,
  tenantId: string,
  locationId: string,
  providerId?: string | null
): Promise<AvailabilityConfig> {
  const { data: locationData, error: locationError } = await db
    .from("agenda_locations")
    .select("business_hours, timezone, buffer_minutes")
    .eq("tenant_id", tenantId)
    .eq("id", locationId)
    .maybeSingle();

  if (locationError) {
    console.error("[getSlots] fetchAvailabilityConfig Error:", locationError);
    throw new AvailabilityError(`Location Error: ${locationError.message}`, 400);
  }
  if (!locationData) throw new AvailabilityError("Consultorio no encontrado", 404);

  let businessHours = (locationData.business_hours as Record<string, [string, string][]>) ?? {};

  if (providerId) {
    const { data: provider, error: providerError } = await db
      .from("agenda_providers" as any)
      .select("metadata")
      .eq("id", providerId)
      .maybeSingle();
    
    if (providerError) {
        console.warn("[getSlots] Provider Fetch Error:", providerError);
    }

    const provSchedule = (provider?.metadata as any)?.schedule;
    if (provSchedule && Object.keys(provSchedule).length > 0) {
      businessHours = provSchedule;
    }
  }

  // Fallback default hours if empty
  if (Object.keys(businessHours).length === 0) {
    businessHours = {
      mon: [["09:00", "18:00"]],
      tue: [["09:00", "18:00"]],
      wed: [["09:00", "18:00"]],
      thu: [["09:00", "18:00"]],
      fri: [["09:00", "18:00"]],
    };
  }

  // Ensure "today" check handles timezone diffs gracefully
  // We use the start of day of the TARGET date and compare to "now"
  // If target date is today, we filter past slots.
  return {
    businessHours,
    timeZone: locationData.timezone ?? "America/Argentina/Buenos_Aires",
    bufferMinutes: locationData.buffer_minutes ?? 0,
  };
}

/**
 * 2. Fetch Data (Appointments + Blocks) for a specific Date Range
 */
export async function fetchAvailabilityData(
  db: AnySupabaseClient,
  tenantId: string,
  startRange: Date,
  endRange: Date
): Promise<AvailabilityData> {
  // Fetch Appointments
  let appointments: any[] = [];
  try {
    // 2026-01-08: RESTORED provider_id selection
    const { data: apptData, error: appointmentsError } = await db
        .from("agenda_appointments" as any)
        .select("start_at, end_at, location_id, provider_id") 
        .eq("tenant_id", tenantId)
        .neq("status", "canceled")
        .gte("end_at", startRange.toISOString())
        .lte("start_at", endRange.toISOString());

    if (appointmentsError) {
        console.error("[getSlots] Appointments Fetch Error:", appointmentsError);
        // Fallback for missing column?
    } else {
        appointments = apptData ?? [];
    }
  } catch (e) {
      console.error("[getSlots] Appointments Unexpected Error:", e);
  }


  // Fetch Blocks
  let blocks: any[] = [];
  // try {
    const { data: blocksData, error: blocksError } = await db
      .from("agenda_availability_blocks" as any)
      .select("start_at, end_at, provider_id, location_id")
      .eq("tenant_id", tenantId)
      .gte("end_at", startRange.toISOString())
      .lte("start_at", endRange.toISOString());
    
    if (blocksError) {
        console.error("[getSlots] Blocks Fetch Error:", blocksError);
    } else {
        blocks = blocksData ?? [];
    }
  // } catch (e) {
  //   console.error("Availability blocks fetch failed", e);
  // }


  return { 
    appointments: appointments ?? [], 
    blocks 
  };
}

/**
 * 3. Calculate Slots for a Single Day
 */
export function calculateDailySlots(
  dayOrDateStr: Date | string,
  config: AvailabilityConfig,
  data: AvailabilityData,
  options: {
    durationMinutes: number;
    locationId: string;
    providerId?: string | null;
  }
): string[] {
  const { businessHours, timeZone, bufferMinutes } = config;
  const { appointments, blocks } = data;
  const { durationMinutes, locationId, providerId } = options;
  
  // Determine the Target Date String (YYYY-MM-DD) for filtering
  let targetDateString: string;
  let seekStart: Date;

  if (typeof dayOrDateStr === 'string') {
      targetDateString = dayOrDateStr;
      // Anchor at UTC noon to avoid edge cases, then scan +/- 24h
      const anchor = new Date(`${dayOrDateStr}T12:00:00Z`);
      if (isNaN(anchor.getTime())) {
          // Fallback
          targetDateString = format(new Date(), "yyyy-MM-dd");
          seekStart = startOfDay(new Date());
      } else {
          seekStart = addMinutes(anchor, -12 * 60); 
      }
  } else {
      targetDateString = format(dayOrDateStr, "yyyy-MM-dd");
      seekStart = startOfDay(dayOrDateStr);
  }

  // Scan window: 48 hours to be safe covering all timezones
  // We strictly filter by "Does this slot fall on targetDateString in targetTimeZone?"
  const startScan = typeof dayOrDateStr === 'string' 
      ? addMinutes(new Date(`${targetDateString}T00:00:00Z`), -12*60) 
      : startOfDay(dayOrDateStr);
      
  const endScan = addMinutes(startScan, 48 * 60);

  const normalizedDuration = Math.max(5, Number.isFinite(durationMinutes) ? durationMinutes : 30);
  const interval = 15;
  const now = new Date();

  console.log(`[Slots] Calc for ${targetDateString}. Scan: ${startScan.toISOString()} -> ${endScan.toISOString()}. TZ: ${timeZone}`);
  
  // Pre-filter blockers for performance
  const blockingAppointments = appointments.filter((appt) => {
    // If provider_id is present, we filter by it.
    if (providerId) {
      // 1. My own appointments block me
      if (appt.provider_id === providerId) return true;
      
      // 2. Appointments without provider (Room/Location blocking) block everyone
      //    (Only if we assume single-room capacity, but typically yes)
      if (!appt.provider_id && appt.location_id === locationId) return true;
      
      // 3. Appointments for OTHER providers do NOT block me
      return false;
    }
    
    // Fallback: If no provider selected (booking 'Any' or checking location), everything in location blocks.
    return appt.location_id === locationId;
  });

  const blockingBlocks = blocks.filter((b) => {
    // 1. Check Location Scope
    // If the block is specific to a location, it only blocks that location.
    if (b.location_id && b.location_id !== locationId) {
        return false;
    }

    // 2. Check Provider Scope
    // If the block is "Global" (no provider), it blocks everyone.
    if (!b.provider_id) return true;
    
    // If the request is for a specific provider, check if it matches.
    if (providerId) {
        return b.provider_id === providerId;
    }
    
    // CRITICAL FIX:
    // If providerId is NOT filtering (Any Provider), the current "Single Resource" logic for appointments
    // (where any appointment blocks the location) suggests we should treat Blocks similarly for safety.
    // If one provider is blocked, we block the slot to prevent "False Availability" in single-provider contexts.
    // Ideally query valid providers, but "Block All" is safer than "Block None".
    return true;
  });

  const slots: string[] = [];
  let current = startScan;

  // Intl formatter for checking the "Local Date" of the slot
  const dateFormatter = new Intl.DateTimeFormat("en-CA", { // YYYY-MM-DD
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  while (isBefore(current, endScan)) {
    const slotEnd = addMinutes(current, normalizedDuration);

    // 1. Check if 'current' is actually on the target day in the requested timezone
    let slotDateLocal: string;
    try {
        slotDateLocal = dateFormatter.format(current);
    } catch (e) {
        console.error("Intl Error", e);
        current = addMinutes(current, interval);
        continue;
    }

    if (slotDateLocal !== targetDateString) {
        // Skip slots not belonging to the requested day
        current = addMinutes(current, interval);
        continue;
    }

    // 2. Check Business Hours
    const isOpen = isWithinBusinessHours({
      start: current,
      end: slotEnd,
      businessHours,
      timeZone,
    });

    if (isOpen) {
      // 3. Check Conflicts
      const hasApptConflict = blockingAppointments.some((appt) => {
        const apptStart = new Date(appt.start_at);
        const apptEnd = new Date(appt.end_at);
        const bufferedStart = addMinutes(apptStart, -bufferMinutes);
        const bufferedEnd = addMinutes(apptEnd, bufferMinutes);
        return current < bufferedEnd && slotEnd > bufferedStart;
      });

      const hasBlockConflict = blockingBlocks.some((block) => {
        const bStart = new Date(block.start_at);
        const bEnd = new Date(block.end_at);
        return current < bEnd && slotEnd > bStart;
      });

      if (!hasApptConflict && !hasBlockConflict) {
        // STRICTLY disallow past slots relative to Server Time (UTC)
        // If today is target day, hide past hours.
        // We use 'now' (UTC).
        if (isAfter(current, now)) {
            // Push time in HH:mm format. 
            // Note: format(current, "HH:mm") uses Local System Time formatting by default unless we pass options?
            // Wait, format() from date-fns follows the Date object's values which are based on system time if inspected via getters, 
            // but 'current' is a Date object.
            // If we want HH:mm in the TARGET timezone, we must use Intl or formatInTimeZone.
            // Let's use Intl to ensure HH:mm matches the business hours check.
            const timeStr = new Intl.DateTimeFormat("en-GB", { // HH:mm
                timeZone,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }).format(current);
            
            slots.push(timeStr);
        }
      }
    }
    current = addMinutes(current, interval);
  }

  // Deduplicate and Sort
  return Array.from(new Set(slots)).sort();
}

// --- Main Exported Functions ---

export async function getAvailabilitySlots(options: {
  db: AnySupabaseClient;
  tenantId: string;
  date: string;
  locationId: string;
  durationMinutes: number;
  providerId?: string | null;
}) {
  const { db, tenantId, date, locationId, durationMinutes, providerId } = options;

  if (!date || !locationId) throw new AvailabilityError("Date and location required", 400);

  // 1. Config
  const config = await fetchAvailabilityConfig(db, tenantId, locationId, providerId);

  // 2. Data Scan Range
  // We fetch a wide range to cover potential timezone shifts (UTC-12 to UTC+14)
  // Anchor at UTC noon of the target string
  const anchor = new Date(`${date}T12:00:00Z`);
  if (isNaN(anchor.getTime())) throw new AvailabilityError("Invalid date format (YYYY-MM-DD required)", 400);

  const startRange = addMinutes(anchor, -24 * 60); 
  const endRange = addMinutes(anchor, 48 * 60);

  const data = await fetchAvailabilityData(db, tenantId, startRange, endRange);

  // 3. Calculate passing the string to ensure timezone-aware filtering
  return calculateDailySlots(date, config, data, {
    durationMinutes,
    locationId,
    providerId
  });
}

/**
 * New: Suggest upcoming slots
 */
export async function findNextAvailableSlots(options: {
  db: AnySupabaseClient;
  tenantId: string;
  fromDate: string;
  locationId: string;
  durationMinutes: number;
  providerId?: string | null;
  daysToScan?: number;
  limit?: number;
}) {
   const { db, tenantId, fromDate, locationId, durationMinutes, providerId, daysToScan = 14, limit = 5 } = options;
   
   const startDate = new Date(fromDate);
   if (!Number.isFinite(startDate.getTime())) throw new AvailabilityError("Invalid date", 400);

   // 1. Config (Once)
   const config = await fetchAvailabilityConfig(db, tenantId, locationId, providerId);

   // 2. Loop in chunks (e.g. 7 days) until we find 'limit' slots or 'daysToScan' is exhausted
   const foundSlots: Array<{ date: string; slots: string[] }> = [];
   const chunkSize = 7;
   let currentStart = startOfDay(startDate);
   const maxDate = addDays(currentStart, daysToScan);
   
   while (isBefore(currentStart, maxDate) && foundSlots.length < limit) {
      const currentEnd = addDays(currentStart, chunkSize);
      // Fetch 7 days of data
      const data = await fetchAvailabilityData(db, tenantId, currentStart, currentEnd);
      
      // Process each day
      for (let i = 0; i < chunkSize; i++) {
         const day = addDays(currentStart, i);
         if (isAfter(day, maxDate)) break;
         
         const dailySlots = calculateDailySlots(day, config, data, {
            durationMinutes,
            locationId,
            providerId
         });

         if (dailySlots.length > 0) {
            foundSlots.push({
               date: format(day, "yyyy-MM-dd"),
               slots: dailySlots.slice(0, 5) // Return top 5 slots per day? Or just the days?
            });
         }

         if (foundSlots.length >= limit) break;
      }
      currentStart = currentEnd;
   }

   return foundSlots;
}
