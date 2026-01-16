"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateAdminNote } from "./actions";
import { useToast } from "@/components/ui/use-toast";

interface AdminNotesProps {
  initialContent: string;
}

export function AdminNotes({ initialContent }: AdminNotesProps) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateAdminNote(content);
        toast({
          title: "Nota guardada",
          description: "La nota del dashboard ha sido actualizada.",
        });
      } catch (error) {
        toast({
           title: "Error",
           description: "No se pudo guardar la nota.",
           variant: "destructive"
        });
      }
    });
  };

  return (
    <Card className="bg-slate-900 text-slate-50 border-slate-800 flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-white text-lg">Admin Notes</CardTitle>
        <Button 
            size="sm" 
            variant="ghost" 
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
            onClick={handleSave}
            disabled={isPending}
        >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-[150px]">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="bg-transparent border-slate-700 text-slate-300 resize-none h-full min-h-[120px] focus-visible:ring-slate-500 focus-visible:ring-offset-0"
          placeholder="Escribe notas para el equipo de admin..."
        />
        <div className="mt-2 text-xs text-slate-500 flex justify-between">
           <span>Visible para Super Admins</span>
           {isPending && <span>Guardando...</span>}
        </div>
      </CardContent>
    </Card>
  );
}
