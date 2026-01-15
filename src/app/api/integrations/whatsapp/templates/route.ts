import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/types/database";
import { getWhatsAppIntegrationByTenant } from "@/server/whatsapp-config";
import { getRouteTenantContext } from "@/server/tenant-context";
import { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  
  if ("error" in context) {
      return context.error;
  }

  const { tenantId } = context;

  // Utilize serviceClient to bypass RLS recursion issues
  // We already verified auth via getRouteTenantContext
  const db = (serviceClient ?? context.supabase) as SupabaseClient<Database>;

  const integration = await getWhatsAppIntegrationByTenant(db, tenantId);

  if (!integration) {
    console.log(`[Templates API] Integration not found for tenant: ${tenantId}`);
    return NextResponse.json({ error: "Integration not configured" }, { status: 404 });
  }

  // WABA ID (Business Account ID) is required for Template Management
  // PhoneID is not enough for this specific endpoint
  if (!integration.businessAccountId) {
    return NextResponse.json({ 
        error: "WABA ID Missing", 
        details: "Para gestionar plantillas, debes configurar el 'Business Account ID' en la integración."
    }, { status: 400 });
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${integration.businessAccountId}/message_templates?fields=name,status,category,language,components,rejected_reason&limit=100`;
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${integration.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
        const errBody = await res.text();
        console.error("Meta Template API Error:", errBody);
        return NextResponse.json({ error: "Meta API Error", details: errBody }, { status: res.status });
    }

    const data = await res.json();
    
    return NextResponse.json({ 
        success: true, 
        data: data.data, // Meta returns { data: [], paging: {} }
        paging: data.paging
    });

  } catch (error) {
    console.error("Template Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  
  if ("error" in context) {
      return context.error;
  }

  const { tenantId, supabase } = context;
  const db = (serviceClient ?? context.supabase) as SupabaseClient<Database>;

  try {
    const body = await request.json();
    const { name, category, language, bodyText, headerText, footerText, buttons, variableExamples } = body;

    // Basic Validation
    if (!name || !category || !bodyText) {
       return NextResponse.json({ error: "Faltan campos requeridos (nombre, categoría, texto)" }, { status: 400 });
    }

    const integration = await getWhatsAppIntegrationByTenant(db, tenantId);

    if (!integration?.businessAccountId) {
        return NextResponse.json({ error: "WABA ID no configurado" }, { status: 400 });
    }

    // Detect variables to generate examples (Required by Meta)
    const varRegex = /{{(\d+)}}/g;
    const bodyVarsFound = new Set<string>();
    let match;
    while ((match = varRegex.exec(bodyText)) !== null) {
        bodyVarsFound.add(match[1]);
    }

    const bodyComponent: any = {
        type: "BODY",
        text: bodyText
    };

    if (bodyVarsFound.size > 0) {
        // Use provided examples or fallback to generic ones
        const sortedVars = Array.from(bodyVarsFound).sort((a,b) => parseInt(a)-parseInt(b));
        
        const exampleValues = sortedVars.map(v => {
            return (variableExamples && variableExamples[v]) ? variableExamples[v] : `ejemplo_${v}`;
        });

        bodyComponent.example = {
            body_text: [exampleValues]
        };
    }

    // Construct Meta Components
    const components: any[] = [
        bodyComponent
    ];

    if (headerText) {
        components.push({
            type: "HEADER",
            format: "TEXT",
            text: headerText
        });
    }

    if (footerText) {
        components.push({
            type: "FOOTER",
            text: footerText
        });
    }

    if (buttons && Array.isArray(buttons) && buttons.length > 0) {
        components.push({
            type: "BUTTONS",
            buttons: buttons // Expecting array of { type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER", text: "..." }
        });
    }

    const payload = {
        name: name.toLowerCase().trim().replace(/\s+/g, '_'), // Meta requires snake_case
        category: category, // UTILITY, MARKETING, AUTHENTICATION
        language: language || "es",
        components: components
    };

    const url = `https://graph.facebook.com/v18.0/${integration.businessAccountId}/message_templates`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${integration.accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
    });

    const responseData = await res.json();

    if (!res.ok) {
        console.error("Meta Create Template Error:", responseData);
        
        const fbError = responseData.error;
        // Prefer user-facing message from Meta
        const errorMsg = fbError?.error_user_msg || fbError?.error_user_title || fbError?.message || "Error al crear plantilla en Meta";

        return NextResponse.json({ error: errorMsg, details: responseData }, { status: res.status });
    }

    // Successfully created in Meta.
    // Optionally: Upsert into local DB. For now, rely on syncing or list.
    
    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error("Create Template API Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  
  if ("error" in context) {
      return context.error;
  }

  const { tenantId } = context;
  const db = (serviceClient ?? context.supabase) as SupabaseClient<Database>;

  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "Nombre de plantilla requerido" }, { status: 400 });
    }

    const integration = await getWhatsAppIntegrationByTenant(db, tenantId);

    if (!integration?.businessAccountId) {
        return NextResponse.json({ error: "WABA ID no configurado" }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v18.0/${integration.businessAccountId}/message_templates?name=${name}`;

    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${integration.accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        const errData = await res.json();
        console.error("Meta Delete Template Error:", errData);
        return NextResponse.json({ error: errData.error?.message || "Error al eliminar plantilla" }, { status: res.status });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete Template API Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}