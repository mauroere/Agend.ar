import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteTenantContext } from "@/server/tenant-context";

const metadataSchema = z.object({
  heroTitle: z.string().trim().max(120).optional().nullable(),
  heroSubtitle: z.string().trim().max(200).optional().nullable(),
  heroTagline: z.string().trim().max(80).optional().nullable(),
  accentColor: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, {
    message: "Color inválido, usa formato hex",
  }).optional().nullable(),
  accentGradient: z.string().trim().max(120).optional().nullable(),
  buttonText: z.string().trim().max(40).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  heroImageUrl: z.string().url().optional().nullable(),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  schedule: z.string().trim().max(200).optional().nullable(),
  companyDisplayName: z.string().trim().max(100).optional().nullable(),
});

const RESERVED_SLUGS = [
  "login", "register", "signup", "dashboard", "admin", "api", 
  "static", "media", "assets", "help", "status", 
  "mail", "email", "webmail", "calendar", "book", "agendar", 
  "app", "www", "ftp", "beta", "dev", "staging", "test",
  "support", "config", "settings", "profile", "user", 
  "account", "billing", "invoice", "payment", "checkout",
  "auth", "oauth", "callback", "verification", "reset-password"
];

const payloadSchema = z.object({
  publicSlug: z
    .string()
    .trim()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .max(50)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      message: "Solo minúsculas, números y guiones",
    })
    .transform((value) => value.toLowerCase())
    .refine((slug) => !RESERVED_SLUGS.includes(slug), {
        message: "Este nombre de enlace no está disponible (reservado)."
    })
    .optional(),
  customDomain: z
    .string()
    .trim()
    .max(120)
    .regex(/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/, {
      message: "Dominio inválido",
    })
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value.toLowerCase() : value))
    .nullable(),
  metadata: metadataSchema.optional(),
});

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const { data, error } = await db
    .from("agenda_tenants")
    .select("id, name, public_slug, custom_domain, public_metadata")
    .eq("id", tenantId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Tenant no encontrado" }, { status: 400 });
  }

  return NextResponse.json({
    tenant: {
      name: data.name,
      publicSlug: data.public_slug,
      customDomain: data.custom_domain,
      metadata: data.public_metadata ?? {},
    },
  });
}

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  let json: Record<string, unknown>;
  try {
    json = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.format() }, { status: 400 });
  }

  const { publicSlug, customDomain, metadata } = parsed.data;

  const updatePayload: Record<string, unknown> = {};
  if (typeof publicSlug === "string") {
    updatePayload.public_slug = publicSlug;
  }
  if (customDomain !== undefined) {
    updatePayload.custom_domain = customDomain ? customDomain : null;
  }
  if (metadata) {
    updatePayload.public_metadata = metadata;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await db
    .from("agenda_tenants")
    .update(updatePayload)
    .eq("id", tenantId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
