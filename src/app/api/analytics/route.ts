import { NextRequest, NextResponse } from "next/server";
import { getRouteTenantContext } from "@/server/tenant-context";
import { startOfMonth, endOfMonth, subDays, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/constants";

type AppointmentsData = {
    id: string;
    status: string;
    start_at: string;
    service_snapshot: any;
    agenda_services: { price_minor_units: number | null } | null;
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId, session } = context;

  // Check Permissions
  const { data: userProfile } = await db
    .from("agenda_users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (userProfile?.role !== "owner") {
    return NextResponse.json(
      { error: "Forbidden: Only owners can view analytics" },
      { status: 403 }
    );
  }

  // Timezone Handling: Calculate "This Month" in Argentina Time
  const now = new Date();
  const zonedNow = toZonedTime(now, APP_TIMEZONE);
  
  // Start of current month in System Time (UTC equivalent for comparison if DB stores ISO strings)
  // Actually, Supabase stores TIMESTAMPTZ. 
  // Let's rely on ISO strings.
  
  const monthStart = startOfMonth(zonedNow);
  const monthEnd = endOfMonth(zonedNow);

  // Convert back to UTC ISO for DB Query
  const fromISO = fromZonedTime(monthStart, APP_TIMEZONE).toISOString();
  // For end date, we want the very end of the month
  const toISO = fromZonedTime(monthEnd, APP_TIMEZONE).toISOString();

  // 1. Fetch Appointments in Range
  const { data: appointments, error: appError } = await db
    .from("agenda_appointments")
    .select(`
        id,
        status,
        start_at,
        service_snapshot,
        agenda_services (
            price_minor_units
        )
    `)
    .eq("tenant_id", tenantId)
    .gte("start_at", fromISO)
    .lte("start_at", toISO)
    .returns<AppointmentsData[]>();

  if (appError) {
      return NextResponse.json({ error: appError.message }, { status: 500 });
  }

  // 2. Fetch New Patients in Range
  const { count: newPatientsCount, error: patError } = await db
    .from("agenda_patients")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", fromISO)
    .lte("created_at", toISO);

  if (patError) {
      return NextResponse.json({ error: patError.message }, { status: 500 });
  }

  // Process Data
  const total = appointments.length;
  const byStatus: Record<string, number> = {};
  let revenue = 0;
  const dailyCounts: Record<string, number> = {};

  appointments.forEach(appt => {
      // Status Counts
      byStatus[appt.status] = (byStatus[appt.status] || 0) + 1;

      // Revenue (Confirmed or Completed)
      if (['confirmed', 'completed'].includes(appt.status)) {
          // Try snapshot first, then relation
          const snapshot = appt.service_snapshot as any;
          const price = snapshot?.price_minor_units ?? appt.agenda_services?.price_minor_units ?? 0;
          revenue += price;
      }

      // Daily Distribution (Format YYYY-MM-DD in Tenant Timezone)
      const dateKey = format(toZonedTime(new Date(appt.start_at), APP_TIMEZONE), 'yyyy-MM-dd');
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
  });

  // Fill zero days for the graph
  const daysInMonth = [];
  let currentDay = monthStart;
  while (currentDay <= monthEnd) {
      const k = format(currentDay, 'yyyy-MM-dd');
      daysInMonth.push({
          date: k,
          count: dailyCounts[k] || 0
      });
      currentDay = new Date(currentDay.setDate(currentDay.getDate() + 1));
  }

  return NextResponse.json({
     period: {
         from: monthStart.toISOString(),
         to: monthEnd.toISOString(),
         timezone: APP_TIMEZONE
     },
     metrics: {
         total_appointments: total,
         confirmed_appointments: (byStatus['confirmed'] || 0) + (byStatus['completed'] || 0),
         canceled_appointments: byStatus['canceled'] || 0,
         no_show_appointments: byStatus['no_show'] || 0,
         new_patients: newPatientsCount || 0,
         estimated_revenue: revenue, // In minor units (cents)
     },
     daily_series: daysInMonth
  });
}
