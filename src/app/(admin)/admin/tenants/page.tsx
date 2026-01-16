"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Search, ExternalLink, Loader2, Globe, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type Tenant = {
  id: string;
  name: string;
  created_at: string;
  public_slug?: string;
  status?: string;
};

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtered, setFiltered] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
                <p className="text-slate-500">Gestión de suscripciones y acceso.</p>
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
                <TableHead>Identificador</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                   <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex justify-center items-center gap-2">
                         <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                      </div>
                   </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                        No se encontraron tenants.
                    </TableCell>
                </TableRow>
              ) : (
                filtered.map((tenant) => {
                  // Construct URL - in prod this would be https://slug.agend.ar
                  // in dev http://slug.localhost:3000
                  const identifier = tenant.public_slug || tenant.id;
                  const url = `http://${identifier}.localhost:3000`; // Assuming local dev for now
                  
                  return (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span>{tenant.name}</span>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{identifier}</TableCell>
                    <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            tenant.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                            'bg-gray-50 text-gray-600 ring-gray-500/10'
                        }`}>
                            {tenant.status || 'active'}
                        </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                             <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={buttonVariants({ variant: "ghost", size: "sm" })}
                                title="Ver sitio público"
                             >
                                <Globe className="h-4 w-4 text-slate-500 hover:text-slate-800" />
                             </a>
                             <a 
                                href={`${url}/calendar`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                             >
                                <LayoutDashboard className="h-3 w-3" />
                                Dashboard
                             </a>
                        </div>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
       </div>
    </div>
  );
}
