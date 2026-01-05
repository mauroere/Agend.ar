import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/database";

export function getServerSupabase() {
  return createServerComponentClient<Database>({
    cookies,
  });
}
