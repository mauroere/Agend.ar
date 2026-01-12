import { NextRequest, NextResponse } from "next/server";
import { TEMPLATE_NAMES, templatePreview } from "@/lib/messages";
import { getRouteTenantContext } from "@/server/tenant-context";
import { Database } from "@/types/database";

type TemplateRow = Database["public"]["Tables"]["agenda_message_templates"]["Row"];

const allowedNames = Object.values(TEMPLATE_NAMES) as string[];

type IncomingTemplate = {
  name: string;
  content: string;
  status: string;
  meta_template_name?: string | null;
};

export async function POST(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const body = await request.json();
  const templates = (body?.templates ?? []) as IncomingTemplate[];

  for (const tpl of templates) {
    if (!allowedNames.includes(tpl.name)) {
      return NextResponse.json({ error: `Template ${tpl.name} not allowed` }, { status: 400 });
    }
    if (!tpl.content || typeof tpl.content !== "string") {
      return NextResponse.json({ error: "Invalid template content" }, { status: 400 });
    }
    const { data: existing } = await db
      .from("agenda_message_templates")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", tpl.name)
      .maybeSingle();

    const existingId = (existing as Pick<TemplateRow, "id"> | null)?.id;

    if (existingId) {
      const updatePayload = {
        content: tpl.content,
        status: tpl.status ?? "active",
        meta_template_name: tpl.meta_template_name ?? null,
      } satisfies Partial<TemplateRow>;

      const { error } = await db
        .from("agenda_message_templates")
        .update(updatePayload)
        .eq("id", existingId)
        .eq("tenant_id", tenantId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const insertPayload = {
        tenant_id: tenantId,
        name: tpl.name,
        language: "es",
        content: tpl.content,
        status: tpl.status ?? "active",
        meta_template_name: tpl.meta_template_name,
      } satisfies Database["public"]["Tables"]["agenda_message_templates"]["Insert"];

      const { error } = await db.from("agenda_message_templates").insert(insertPayload);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { db, tenantId } = context;

  const { data, error } = await db
    .from("agenda_message_templates")
    .select("name, content, status, meta_template_name")
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Fill defaults for missing templates
  const typed = (data ?? []) as Array<Pick<TemplateRow, "name" | "content" | "status" | "meta_template_name">>;

  const mapped = allowedNames.map((name) => {
    const existing = typed.find((row) => row.name === name);
    return {
      name,
      content: existing?.content ?? templatePreview[name as keyof typeof templatePreview],
      status: existing?.status ?? "active",
      meta_template_name: existing?.meta_template_name ?? null,
    };
  });

  return NextResponse.json({ templates: mapped });
}
