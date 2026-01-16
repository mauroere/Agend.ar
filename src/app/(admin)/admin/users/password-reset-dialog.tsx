"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LockKeyhole, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { adminResetPassword } from "./actions";

interface PasswordResetDialogProps {
  userId: string;
  userEmail: string;
}

export function PasswordResetDialog({ userId, userEmail }: PasswordResetDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
        toast({
            title: "Error",
            description: "La contraseña debe tener al menos 6 caracteres.",
            variant: "destructive"
        });
        return;
    }

    setLoading(true);
    
    const result = await adminResetPassword(userId, password);
    
    setLoading(false);

    if (result.error) {
      toast({
        title: "Error al actualizar",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: `Contraseña actualizada para ${userEmail}`,
        className: "bg-emerald-600 text-white border-emerald-700",
      });
      setOpen(false);
      setPassword("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
          <LockKeyhole className="h-4 w-4 mr-2" />
          Reset Pass
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Forzar Cambio de Contraseña</DialogTitle>
          <DialogDescription>
            Esta acción cambiará inmediatamente la contraseña para <span className="font-semibold text-slate-900">{userEmail}</span>. 
            El usuario deberá reconectarse en todos sus dispositivos.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-2">
            <div className="flex">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <p className="text-sm text-amber-700">
                    No necesitas la contraseña anterior. Esta es una acción administrativa privilegiada.
                    </p>
                </div>
            </div>
        </div>

        <form onSubmit={handleReset}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-pass" className="text-right">
                Nueva
              </Label>
              <Input
                id="new-pass"
                type="text" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                placeholder="Mínimo 6 caracteres"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar Contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
