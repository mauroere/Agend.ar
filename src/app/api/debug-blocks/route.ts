
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";

export async function GET() {
  const db = serviceClient;
  if (!db) return NextResponse.json({ error: "No service client" });

  const { data: providers } = await db.from("agenda_providers").select("id, full_name");
  
  // Cast to any because types might be missing
  const { data: blocks, error } = await db.from("agenda_availability_blocks" as any).select("*");

  return NextResponse.json({ 
    providers, 
    blocks, 
    error 
  });
}
