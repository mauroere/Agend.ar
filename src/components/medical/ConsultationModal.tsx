"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Camera, UploadCloud, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { UploadDropzone } from "@/components/uploader/UploadDropzone";
import Image from "next/image";

type ConsultationProps = {
   appointmentId: string;
   patientName: string;
   serviceName: string;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSuccess: () => void;
};

export function ConsultationModal({ appointmentId, patientName, serviceName, open, onOpenChange, onSuccess }: ConsultationProps) {
   const [notes, setNotes] = useState("");
   const [diagnosis, setDiagnosis] = useState("");
   const [treatment, setTreatment] = useState("");
   const [attachments, setAttachments] = useState<string[]>([]);
   const [loading, setLoading] = useState(false);
   const { toast } = useToast();

   const handleSubmit = async () => {
       if (!diagnosis && !notes) {
           return toast({ title: "Atención", description: "Cargá al menos un diagnóstico o nota.", variant: "destructive" });
       }
       
       setLoading(true);
       try {
           const res = await fetch(`/api/medical/records`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                   appointmentId,
                   diagnosis,
                   treatment,
                   notes,
                   attachments
               })
           });
           
           if (!res.ok) {
               const errData = await res.json().catch(() => ({}));
               throw new Error(errData.error || "Falló al guardar");
           }
           
           toast({ title: "Consulta Finalizada", description: "Historia clínica actualizada correctamente." });
           onOpenChange(false);
           onSuccess();
       } catch (e: any) {
           console.error(e);
           toast({ 
               title: "Error", 
               description: e.message || "No se pudo guardar la consulta.", 
               variant: "destructive" 
           });
       } finally {
           setLoading(false);
       }
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 gap-0">
             <div className="bg-slate-50 border-b p-4 md:p-6 flex flex-col gap-1">
                 <DialogTitle className="text-xl">Atención de Paciente</DialogTitle>
                 <DialogDescription className="flex items-center gap-2">
                     <span className="font-semibold text-slate-900">{patientName}</span>
                     <span>•</span>
                     <span className="text-slate-600">{serviceName}</span>
                 </DialogDescription>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
                 <Tabs defaultValue="clinical" className="w-full">
                     <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6 mb-6">
                         <TabsTrigger value="clinical" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 rounded-none px-0 pb-2 font-medium">
                             Datos Clínicos
                         </TabsTrigger>
                         <TabsTrigger value="images" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 rounded-none px-0 pb-2 font-medium">
                             Imágenes y Archivos
                         </TabsTrigger>
                     </TabsList>
                     
                     <TabsContent value="clinical" className="space-y-6 mt-0">
                         <div className="space-y-2">
                             <label className="text-sm font-semibold text-slate-700">Diagnóstico / Motivo</label>
                             <Textarea 
                                placeholder="Escribí el diagnóstico principal..." 
                                value={diagnosis}
                                onChange={e => setDiagnosis(e.target.value)}
                                className="min-h-[80px]"
                             />
                         </div>
                         <div className="space-y-2">
                             <label className="text-sm font-semibold text-slate-700">Tratamiento Realizado</label>
                             <Textarea 
                                placeholder="Detalle del procedimiento..." 
                                value={treatment}
                                onChange={e => setTreatment(e.target.value)}
                                className="min-h-[120px]"
                             />
                         </div>
                         <div className="space-y-2">
                             <label className="text-sm font-semibold text-slate-700">Observaciones Generales</label>
                             <Textarea 
                                placeholder="Notas internas..." 
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                             />
                         </div>
                     </TabsContent>

                     <TabsContent value="images" className="space-y-6 mt-0">
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                             {attachments.map((url, idx) => (
                                 <div key={idx} className="relative aspect-square rounded-lg border bg-slate-50 overflow-hidden group">
                                     <Image 
                                        src={url} 
                                        alt="Adjunto" 
                                        fill 
                                        className="object-cover" 
                                        unoptimized
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                     />
                                     <button 
                                        onClick={() => setAttachments(prev => prev.filter(p => p !== url))}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                     >
                                         ✕
                                     </button>
                                 </div>
                             ))}
                             
                             <div className="aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-colors flex flex-col items-center justify-center cursor-pointer">
                                 <UploadDropzone
                                    label=" "
                                    description="Subir Foto"
                                    value=""
                                    onChange={(url) => url && setAttachments(prev => [...prev, url])}
                                    folder="medical-files"
                                    accept="image/*"
                                    capture="environment" // Enables camera on mobile
                                 />
                             </div>
                         </div>
                     </TabsContent>
                 </Tabs>
             </div>

             <DialogFooter className="border-t p-4 bg-slate-50 flex-col-reverse md:flex-row gap-2">
                 <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                 <Button onClick={handleSubmit} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                     {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                     Finalizar Turno
                 </Button>
             </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
