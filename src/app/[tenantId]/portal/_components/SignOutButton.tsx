"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button, ButtonProps } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton(props: ButtonProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <Button onClick={handleSignOut} {...props}>
      <LogOut className="w-4 h-4 mr-2" />
      Salir
    </Button>
  );
}
