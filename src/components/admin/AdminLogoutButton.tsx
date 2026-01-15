"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleLogout}
      className="text-slate-400 hover:text-white hover:bg-slate-800"
      title="Cerrar Sessión"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
