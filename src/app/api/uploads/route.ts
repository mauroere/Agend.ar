import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Buffer } from "node:buffer";
import { serviceClient } from "@/lib/supabase/service";
import { getRouteTenantContext } from "@/server/tenant-context";

const BUCKET = process.env.NEXT_PUBLIC_UPLOAD_BUCKET ?? "public-assets";
const ensuredBuckets = new Set<string>();

async function ensureBucketExists(bucket: string) {
  if (!serviceClient) throw new Error("Service client is not configured");

  if (ensuredBuckets.has(bucket)) return;

  const { data, error } = await serviceClient.storage.getBucket(bucket);
  if (!error && data) {
    ensuredBuckets.add(bucket);
    return;
  }

  const { error: createError } = await serviceClient.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024,
  });

  if (createError && !createError.message.includes("already exists")) {
    throw createError;
  }

  ensuredBuckets.add(bucket);
}

export async function POST(request: NextRequest) {
  if (!serviceClient) {
    return NextResponse.json({ error: "Supabase service client no configurado" }, { status: 500 });
  }

  const context = await getRouteTenantContext(request);
  if ("error" in context) return context.error;
  const { tenantId } = context;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes o videos" }, { status: 400 });
  }

  try {
    await ensureBucketExists(BUCKET);
  } catch (error) {
    console.error("ensure_bucket_failed", error);
    return NextResponse.json({ error: "No pudimos preparar el almacenamiento" }, { status: 500 });
  }

  const folder = (formData.get("folder") as string | null)?.replace(/[^a-zA-Z0-9/_-]+/g, "") || "public";
  const extension = file.name.split(".").pop() ?? "bin";
  const filePath = `${tenantId}/${folder}/${new Date().toISOString().split("T")[0]}-${randomUUID()}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await serviceClient.storage
    .from(BUCKET)
    .upload(filePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("upload_failed", error);
    return NextResponse.json({ error: "No pudimos guardar el archivo" }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = serviceClient.storage.from(BUCKET).getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrl, path: filePath });
}
