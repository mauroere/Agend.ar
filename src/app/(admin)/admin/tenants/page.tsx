"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Search, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

type Tenant = {
  id: string;
  name: string;
  created_at: string;
  public_slug?: string;
};

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtered, setFiltered] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/tenants")
        .then(res => res.json())
        .then(data => {
            setTenants(data.tenants || []);
            setFiltered(data.tenants || []);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(tenants.filter(t => t.name.toLowerCase().includes(term) || t.id.includes(term)));
  }, [search, tenants]);

  const handleImpersonate = async (tenantId: string) => {
      try {
          const res = await fetch("/api/admin/impersonate", {
              method: "POST",
              body: JSON.stringify({ tenantId }),
          });
          if (res.ok) {
              toast({ title: "Acceso Concedido", description: "Redirigiendo al tenant..." });
              window.location.href = "/calendar"; // Force full reload to reset layout/context
          } else {
              toast({ title: "Error", description: "No se pudo acceder.", variant: "destructive" });
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleStopImpersonating = async () => {
    // This logic should probably be in a global admin bar, but putting it here for completeness
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    window.location.href = "/admin/tenants";
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
                <p className="text-slate-500">Gestión de suscripciones.</p>
            </div>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                   placeholder="Buscar tenant..." 
                   className="pl-9" 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                />
            </div>
       </div>

       <div className="rounded-md border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Fecha Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                   <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex justify-center items-center gap-2">
                         <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                      </div>
                   </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                        No se encontraron tenants.
                    </TableCell>
                </TableRow>
              ) : (
                filtered.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                                <Building2 className="h-4 w-4" />
                            </div>
                            {tenant.name}
                        </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{tenant.id}</TableCell>
                    <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                        <Button 
                           size="sm" 
                           variant="outline" 
                           onClick={() => handleImpersonate(tenant.id)}
                           className="gap-2"
                        >
                           <ExternalLink className="h-3 w-3" />
                           Entrar
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
       </div>
    </div>
  );
}
