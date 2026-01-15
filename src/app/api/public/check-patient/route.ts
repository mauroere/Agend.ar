import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { resolveTenantIdFromPublicIdentifier } from "@/server/tenant-routing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    if (!serviceClient) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    
    try {
        const body = await req.json();
        const { email, tenantId: tenantParam, tenantSlug } = body;
        
        if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

        const tenantId = await resolveTenantIdFromPublicIdentifier({ 
            tenantId: tenantParam, 
            tenantSlug: tenantSlug ?? tenantParam 
        });

        if (!tenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

        // Check agenda_patients (Si tiene cuenta local de paciente con ese email)
        const { data: patients, error } = await serviceClient
            .from("agenda_patients")
            .select("id, full_name")
            .eq("tenant_id", tenantId)
            .eq("email", email) 
            .limit(1);
        
        if (error) {
             console.error("Error checking patient:", error);
             return NextResponse.json({ exists: false, error: error.message });
        }

        if (patients && patients.length > 0) {
            return NextResponse.json({ exists: true, name: patients[0].full_name, type: 'patient' });
        }

        // Si tenemos integración de usuarios globales (auth.users) podríamos checkear aqui
        // usando serviceClient.auth.admin.listUsers() filtrado, pero es costoso.
        // Asumimos validación a nivel de tenant/paciente por ahora.

        return NextResponse.json({ exists: false });

    } catch (e: any) {
        console.error("Check Patient Error:", e);
        // Silenciosamente fallar si la columna no existe o hay otro error, para no romper el flujo
        return NextResponse.json({ exists: false, error: e.message }); 
    }
}
