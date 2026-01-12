import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase/route";
import { fetchAvailabilityConfig } from "@/server/availability/getSlots";
import { format } from "date-fns";
import { isWithinBusinessHours } from "@/lib/scheduling";
import { Database } from "@/types/database";

type ProviderRow = Database["public"]["Tables"]["agenda_providers"]["Row"];

export async function GET(request: NextRequest) {
  const supabase = getRouteSupabase();
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");
  const locationId = searchParams.get("locationId");
  const dateStr = searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");

  if (!providerId || !locationId) {
    return NextResponse.json({ error: "ProviderId and LocationId required" });
  }

  const { data } = await supabase
    .from("agenda_providers")
    .select("*")
    .eq("id", providerId)
    .single();

  const provider = data as ProviderRow | null;

  if (!provider) return NextResponse.json({ error: "Provider not found" });

  try {
     // 1. Check Config Logic
     const config = await fetchAvailabilityConfig(supabase, provider.tenant_id, locationId, providerId);
     
     // 2. Check Specific Date
     const targetDate = new Date(`${dateStr}T12:00:00Z`); // Noon UTC
     
     // Simulate 30 min slots for that day
     const slotsCheck = [];
     for(let h=8; h<20; h++) {
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        const slotStart = new Date(`${dateStr}T${timeStr}:00`); // Local time implicit? No, fetchAvailabilityConfig return TZ
        
        // We need to construct the date in the Target TimeZone to test isWithinBusinessHours accurately?
        // Actually isWithinBusinessHours takes a Date object.
        // Let's create a Date object that effectively represents 10:00 AM in the given timezone.
        // This is tricky without a library like date-fns-tz, but let's approximate by using string parsing if TZ is local?
        // Let's just use a simple string construction assuming UTC for the test input, but providing the correct TZ to the function.
        
        // Better: Validate logic for the given date
        const start = new Date(targetDate);
        start.setHours(h, 0, 0, 0); // This sets it in Server Local time, might be confusing.
        
        // Let's just return the config and the raw metadata to verification.
        const end = new Date(start);
        end.setMinutes(30);
        
        slotsCheck.push({
           time: timeStr,
           isOpen: isWithinBusinessHours({ start, end, businessHours: config.businessHours, timeZone: config.timeZone })
        });
     }

     return NextResponse.json({
        providerName: provider.full_name,
        rawMetadata: provider.metadata,
        resolvedConfig: config,
        sampleCheck: slotsCheck
     });

  } catch (e: any) {
     return NextResponse.json({ error: e.message, stack: e.stack });
  }
}
