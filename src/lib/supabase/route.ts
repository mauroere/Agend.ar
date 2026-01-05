import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export function getRouteSupabase(): SupabaseClient<Database, "public"> {
  return createRouteHandlerClient<Database, "public">({ cookies });
}
