"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, RefreshCw, MessageSquare, Plus, Info, Eye, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

type Template = {
  name: string;
  status: string;
  category: string;
  language: string;
  id: string;
  rejected_reason?: string;
  components?: any[];
};

type ContentPreview = {
    name: string;
    content: string;
    status: string; // active/inactive
    meta_template_name?: string | null;
};

const SYSTEM_EVENTS = [
    { key: "appointment_created", label: "Nuevo Turno (Confirmación Inmediata)", description: "Se envía automáticamente al crear un turno." },
    { key: "appointment_confirmed", label: "Turno Confirmado", description: "Se envía cuando el paciente confirma su asistencia." },
    { key: "reminder_24h", label: "Recordatorio 24hs", description: "Se envía un día antes del turno." },
    { key: "reminder_2h", label: "Recordatorio 2hs", description: "Se envía 2 horas antes del turno." },
    { key: "waitlist_offer", label: "Lista de Espera", description: "Se envía cuando se libera un horario." },
];

export function WhatsAppTemplatesSettings() {
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Meta Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  
  // System Configuration
  const [systemConfig, setSystemConfig] = useState<ContentPreview[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  const [viewedTemplate, setViewedTemplate] = useState<Template | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [variableExamples, setVariableExamples] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "UTILITY", // Default to UTILITY as it's most common for appointments
    language: "es",
    bodyText: "Hola {{1}}, ..."
  });

  const devTenantHeader =
    process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? (process.env.NODE_ENV === "development" ? "tenant_1" : undefined);
  
  const withTenantHeaders = useCallback(
    (headers: Record<string, string> = {}) =>
      devTenantHeader ? { ...headers, "x-tenant-id": devTenantHeader } : headers,
    [devTenantHeader],
  );

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch available templates from Meta
      const resMeta = await fetch("/api/integrations/whatsapp/templates", {
        headers: withTenantHeaders(),
      });
      const dataMeta = await resMeta.json();

      if (!resMeta.ok) {
        if (dataMeta.error === "WABA ID Missing") {
            console.warn("WABA ID missing");
        } else {
             // Don't throw here to allow loading system config even if Meta fails
             console.error(dataMeta.error);
        }
      } else {
          setTemplates(dataMeta.data || []);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No pudimos cargar las plantillas de Meta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [withTenantHeaders, toast]);

  const fetchSystemConfig = useCallback(async () => {
      setConfigLoading(true);
      try {
          // 2. Fetch current system mapping
          const resConfig = await fetch("/api/settings/templates");
          const dataConfig = await resConfig.json();
          if (dataConfig.templates) {
              setSystemConfig(dataConfig.templates);
          }
      } catch (err) {
          console.error("Error fetching system config", err);
      } finally {
          setConfigLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchSystemConfig();
  }, [fetchTemplates, fetchSystemConfig]);

  const saveSystemConfig = async () => {
      setSavingConfig(true);
      try {
          const res = await fetch("/api/settings/templates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ templates: systemConfig })
          });
          
          if (!res.ok) throw new Error("Error al guardar configuración");

          toast({
              title: "Configuración guardada",
              description: "Las plantillas se han asignado correctamente a los eventos."
          });
      } catch (error) {
           toast({
              title: "Error",
              description: "No se pudo guardar la configuración.",
              variant: "destructive"
          });
      } finally {
          setSavingConfig(false);
      }
  };

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    try {
        const res = await fetch(`/api/integrations/whatsapp/templates?name=${templateToDelete.name}`, {
            method: "DELETE",
            headers: withTenantHeaders()
        });
        
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Error al eliminar la plantilla");
        }

        toast({
            title: "Plantilla eliminada",
            description: `La plantilla ${templateToDelete.name} ha sido eliminada.`
        });
        
        fetchTemplates();
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
        });
    } finally {
        setIsDeleting(false);
        setTemplateToDelete(null);
    }
  };

  const validateBody = (text: string) => {
    // Regex looking for {{...}}
    const varRegex = /{{(\d+)}}/g; 
    let match;
    const foundNumbers: number[] = [];
    
    // Check for named variables (e.g. {{name}}) which are invalid
    const invalidFormatRegex = /{{(?!(\d+)\s*})[^}]+}}/g;
    if (invalidFormatRegex.test(text)) {
        setValidationError("Las variables deben ser números secuenciales: {{1}}, {{2}}...");
        return false;
    }

    while ((match = varRegex.exec(text)) !== null) {
        foundNumbers.push(parseInt(match[1]));
    }

    if (foundNumbers.length > 0) {
        // Sort and check sequence
        foundNumbers.sort((a, b) => a - b);
        
        // Are they distinct? (Set)
        const unique = Array.from(new Set(foundNumbers));
        
        if (unique[0] !== 1) {
             setValidationError("Las variables deben comenzar por {{1}}.");
             return false;
        }

        for (let i = 0; i < unique.length; i++) {
            if (unique[i] !== i + 1) {
                 setValidationError(`Falta la variable {{${i + 1}}}. La secuencia debe ser completa.`);
                 return false;
            }
        }
        
        // Initialize examples for new variables if they don't exist
        setVariableExamples(prev => {
            const next = { ...prev };
            unique.forEach(num => {
                const key = num.toString();
                if (!next[key]) next[key] = "";
            });
            // Cleanup unused
            Object.keys(next).forEach(key => {
                if (!unique.includes(parseInt(key))) delete next[key];
            });
            return next;
        });
    } else {
        setVariableExamples({});
    }

    setValidationError(null);
    return true;
  };

  const handleCreate = async () => {
    if (!validateBody(formData.bodyText)) {
        return;
    }

    // Validate examples are filled
    const missingExample = Object.entries(variableExamples).find(([_, val]) => !val.trim());
    if (Object.keys(variableExamples).length > 0 && missingExample) {
        toast({
            title: "Faltan ejemplos",
            description: `Por favor completa el ejemplo para la variable {{${missingExample[0]}}}.`,
            variant: "destructive"
        });
        return;
    }

    setCreating(true);
    try {
        const res = await fetch("/api/integrations/whatsapp/templates", {
            method: "POST",
            headers: withTenantHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                ...formData,
                variableExamples 
            })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || "Error al crear plantilla");
        }

        toast({
            title: "Plantilla creada",
            description: "La plantilla se ha enviado a revisión en Meta.",
        });
        
        setOpen(false);
        fetchTemplates(); // Refresh list
        setFormData({ ...formData, name: "", bodyText: "" }); // Reset form partially
        setVariableExamples({}); // Reset examples

    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
        });
    } finally {
        setCreating(false);
    }
  };

//   useEffect(() => {
//     fetchTemplates();
//   }, [fetchTemplates]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-500 hover:bg-green-600";
      case "REJECTED":
        return "bg-red-500 hover:bg-red-600";
      case "PENDING":
        return "bg-yellow-500 hover:bg-yellow-600";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Plantillas de WhatsApp
          </CardTitle>
          <CardDescription>
            Tus plantillas sincronizadas directamente desde Meta.
          </CardDescription>
        </div>
        <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva Plantilla</DialogTitle>
                        <DialogDescription>
                            Define el contenido de tu nueva plantilla de WhatsApp. 
                            Una vez creada, pasará a revisión por Meta (aprox. 24h).
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input 
                                id="name" 
                                placeholder="ej: appointment_reminder" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                            />
                            <p className="text-[0.8rem] text-slate-500">Solo minúsculas, números y guiones bajos.</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category">Categoría</Label>
                                <Select 
                                    id="category" 
                                    value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                >
                                    <option value="UTILITY">Utilidad (Turnos)</option>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="AUTHENTICATION">Autenticación</option>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="language">Idioma</Label>
                                <Select 
                                    id="language"
                                    value={formData.language}
                                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                                >
                                    <option value="es">Español (ES)</option>
                                    <option value="es_AR">Español (Argentina)</option>
                                    <option value="en_US">Inglés (US)</option>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="body">Contenido</Label>
                            <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 border border-blue-100 mb-2">
                                <p className="font-semibold mb-1">Guía de Variables del Sistema</p>
                                <p className="text-xs mb-2">Para que Agend.ar rellene los datos automáticamente al confirmar un turno, usa este orden:</p>
                                <ul className="list-disc pl-4 space-y-1 text-xs">
                                    <li><strong>{"{{1}}"}</strong>: Nombre del Paciente</li>
                                    <li><strong>{"{{2}}"}</strong>: Fecha del turno (ej: 15 de Enero)</li>
                                    <li><strong>{"{{3}}"}</strong>: Fecha (duplicado opcional)</li>
                                    <li><strong>{"{{4}}"}</strong>: Hora del turno (ej: 09:30)</li>
                                    <li><strong>{"{{5}}"}</strong>: Lugar y Profesional</li>
                                </ul>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-md text-sm text-amber-800 border border-amber-100 mb-2">
                                <p className="font-semibold mb-1">¡Consejo para evitar rechazos!</p>
                                <ul className="list-disc pl-4 space-y-1 text-xs">
                                    <li>Meta rechazará plantillas con muy poco texto.</li>
                                    <li><strong>Mal:</strong> "Hola {"{{1}}"}, turno el {"{{2}}"}"</li>
                                    <li><strong>Bien:</strong> "Hola {"{{1}}"}, confirmamos tu cita para el día {"{{2}}"}. Si necesitas cancelar, avísanos."</li>
                                </ul>
                            </div>
                            <Textarea  
                                id="body" 
                                placeholder="Escribe tu mensaje aquí..." 
                                className={`h-32 ${validationError ? "border-red-500 ring-red-500" : ""}`} // Add validation style
                                value={formData.bodyText}
                                onChange={(e) => {
                                    setFormData({...formData, bodyText: e.target.value});
                                    validateBody(e.target.value);
                                }}
                            />
                            {validationError && (
                                <p className="text-[0.8rem] text-red-500 font-medium mt-1">
                                    {validationError}
                                </p>
                            )}
                            {!validationError && (
                            <p className="text-[0.8rem] text-slate-500">
                                Usa variables como {"{{1}}"}, {"{{2}}"} para datos dinámicos. 
                            </p>
                            )}
                        </div>

                        {Object.keys(variableExamples).length > 0 && (
                            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-3">
                                <h4 className="text-sm font-medium text-slate-700">Ejemplos de contenido (Requerido por Meta)</h4>
                                <p className="text-xs text-slate-500">
                                    Meta necesita saber qué tipo de información contendrá cada variable para aprobar la plantilla.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.keys(variableExamples).sort((a,b) => parseInt(a)-parseInt(b)).map(varNum => (
                                        <div key={varNum} className="space-y-1">
                                            <Label htmlFor={`ex-${varNum}`} className="text-xs">
                                                Ejemplo para {"{{"}{varNum}{"}}"}
                                            </Label>
                                            <Input
                                                id={`ex-${varNum}`}
                                                placeholder={varNum === "1" ? "Ej: Juan Perez" : varNum === "2" ? "Ej: 15/01" : "Ej: Valor"}
                                                className="h-8 text-sm"
                                                value={variableExamples[varNum]}
                                                onChange={(e) => setVariableExamples(prev => ({...prev, [varNum]: e.target.value}))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} disabled={creating}>
                            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Plantilla
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading}>
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Sincronizar</span>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
                No hay plantillas cargadas o no has sincronizado aún.
                <br />
                Asegurate de tener configurado el <strong>Business Account ID</strong>.
            </div>
        ) : (
        <div className="max-h-[400px] overflow-y-auto">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Idioma</TableHead>
                <TableHead className="text-right">Estado</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {templates.map((t) => (
                <TableRow key={t.id || t.name}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <span>{t.name}</span>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-slate-400 hover:text-slate-600"
                                onClick={() => setViewedTemplate(t)}
                            >
                                <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setTemplateToDelete(t)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{t.category}</TableCell>
                    <TableCell className="text-xs text-slate-500">{t.language}</TableCell>
                    <TableCell className="text-right">
                        {t.status === "REJECTED" ? (
                             <Popover>
                                <PopoverTrigger>
                                    <Badge className={`${getStatusColor(t.status)} text-white border-0 cursor-pointer`}>
                                        {t.status} <Info className="h-3 w-3 ml-1" />
                                    </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-80" side="left">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none text-red-600">Rechazada por Meta</h4>
                                        <p className="text-sm text-slate-500">
                                            {t.rejected_reason || "Razón no especificada por Meta. Intenta sincronizar nuevamente."}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Intenta crearla nuevamente corrigiendo estos puntos.
                                        </p>
                                    </div>
                                </PopoverContent>
                             </Popover>
                        ) : (
                            <Badge className={`${getStatusColor(t.status)} text-white border-0`}>
                                {t.status}
                            </Badge>
                        )}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
        )}
      </CardContent>

      <CardContent className="border-t pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
                 <CardTitle className="text-lg flex items-center gap-2">Configuración de Eventos</CardTitle>
                 <CardDescription>Asigna qué plantilla de Meta usar para cada acción automática.</CardDescription>
            </div>
             <Button onClick={saveSystemConfig} disabled={savingConfig || configLoading}>
                {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Configuración
            </Button>
          </div>
         
         {configLoading ? (
             <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>
         ) : (
             <div className="space-y-4">
                 {SYSTEM_EVENTS.map(event => {
                     const currentConfig = systemConfig.find(c => c.name === event.key);
                     const currentMetaTemplate = currentConfig?.meta_template_name;
                     const isActive = currentConfig?.status === 'active';

                     return (
                         <div key={event.key} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="space-y-1 max-w-[50%]">
                                <div className="flex items-center gap-2">
                                     <Label className="text-base font-semibold">{event.label}</Label>
                                     <Badge variant={isActive ? "default" : "secondary"}>
                                         {isActive ? "Activo" : "Inactivo"}
                                     </Badge>
                                </div>
                                <p className="text-sm text-slate-500">{event.description}</p>
                             </div>
                             
                             <div className="flex items-center gap-4 flex-1 justify-end">
                                 <div className="w-[300px]">
                                     <select 
                                         className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                         value={currentMetaTemplate || ""}
                                         onChange={(e) => {
                                             const val = e.target.value || null;
                                             setSystemConfig(prev => {
                                                 const idx = prev.findIndex(p => p.name === event.key);
                                                 if (idx === -1) return prev; // Should not happen
                                                 const copy = [...prev];
                                                 copy[idx] = { ...copy[idx], meta_template_name: val };
                                                 return copy;
                                             });
                                         }}
                                     >
                                         <option value="">-- Usar plantilla predeterminada --</option>
                                         {templates
                                            .filter(t => t.status === "APPROVED")
                                            .map(t => (
                                             <option key={t.name} value={t.name}>
                                                 {t.name} ({t.language})
                                             </option>
                                         ))}
                                     </select>
                                     <p className="text-[10px] text-slate-400 mt-1 pl-1">
                                         Solo plantillas aprobadas
                                     </p>
                                 </div>
                                 <Switch 
                                    checked={isActive}
                                    onCheckedChange={(checked) => {
                                         setSystemConfig(prev => {
                                             const idx = prev.findIndex(p => p.name === event.key);
                                             if (idx === -1) return prev;
                                             const copy = [...prev];
                                             copy[idx] = { ...copy[idx], status: checked ? 'active' : 'inactive' };
                                             return copy;
                                         });
                                    }}
                                 />
                             </div>
                         </div>
                     );
                 })}
             </div>
         )}
      </CardContent>

      <Dialog open={!!viewedTemplate} onOpenChange={(open) => !open && setViewedTemplate(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Detalles de Plantilla</DialogTitle>
                <DialogDescription>
                   Visualiza el contenido de <strong>{viewedTemplate?.name}</strong>
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500 font-normal uppercase tracking-wider">Cuerpo del Mensaje</Label>
                    <div className="p-4 bg-slate-50 rounded-md text-sm whitespace-pre-wrap border border-slate-100">
                        {viewedTemplate?.components?.find(c => c.type === "BODY")?.text || "Sin contenido de texto disponible."}
                    </div>
                </div>
                {viewedTemplate?.components?.find(c => c.type === "HEADER" && c.format === "TEXT") && (
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-500 font-normal uppercase tracking-wider">Cabecera</Label>
                         <div className="p-2 bg-slate-50 rounded-md text-sm border border-slate-100 font-bold">
                            {viewedTemplate.components.find(c => c.type === "HEADER")?.text}
                        </div>
                    </div>
                )}
                 {viewedTemplate?.components?.find(c => c.type === "FOOTER") && (
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-500 font-normal uppercase tracking-wider">Pie de Página</Label>
                         <div className="p-2 bg-slate-50 rounded-md text-xs text-slate-500 border border-slate-100">
                            {viewedTemplate.components.find(c => c.type === "FOOTER")?.text}
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button onClick={() => setViewedTemplate(null)}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Eliminar Plantilla
                </DialogTitle>
                <DialogDescription>
                    ¿Estás seguro de que deseas eliminar la plantilla <strong>{templateToDelete?.name}</strong>?
                    <br/><br/>
                    Esta acción es irreversible y la plantilla dejará de estar disponible para enviar mensajes inmediatamente.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setTemplateToDelete(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Eliminar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
