import { NextRequest, NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron";
import { runWaitlistJob } from "@/lib/jobs/waitlist";

export async function GET(request: NextRequest) {
  try {
    assertCronSecret(request.headers);
    await runWaitlistJob();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
