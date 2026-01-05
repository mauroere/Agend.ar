import { NextRequest, NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron";
import { runReminderJob } from "@/lib/jobs/reminders";

export async function GET(request: NextRequest) {
  try {
    assertCronSecret(request.headers);
    await runReminderJob({ hoursAhead: 2 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
