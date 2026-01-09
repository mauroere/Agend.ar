"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { UploadCloud, Loader2, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

export type UploadDropzoneProps = {
  label?: string;
  description?: string;
  value?: string | null;
  folder?: string;
  accept?: string;
  capture?: "user" | "environment";
  onChange?: (url: string | null) => void;
};

export function UploadDropzone({
  label,
  description,
  value,
  folder = "public",
  accept = "image/*,video/*",
  capture,
  onChange,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file) return;
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast({ title: "Formato no soportado", description: "Subí imágenes o videos", variant: "destructive" });
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "No pudimos subir el archivo");
        onChange?.(data.url ?? null);
        toast({ title: "Archivo cargado", description: file.name });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo subir el archivo",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [folder, onChange, toast]
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (file) void uploadFile(file);
    input.value = "";
  };

  const triggerSelect = () => inputRef.current?.click();
  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    triggerSelect();
  };
  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };
  const handleClearClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onChange?.(null);
  };

  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-medium text-slate-700">{label}</p> : null}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center transition",
          dragging && "border-slate-500 bg-slate-50"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={handleDrop}
        onClick={triggerSelect}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        ) : (
          <UploadCloud className="h-8 w-8 text-slate-400" />
        )}
        <p className="mt-3 text-sm text-slate-600">
          {uploading ? "Subiendo..." : "Arrastrá tu archivo o tocá para cargar"}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleButtonClick} disabled={uploading}>
            Elegir desde dispositivo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleButtonClick}
            disabled={uploading}
            className="flex items-center gap-1"
          >
            <Camera className="h-3.5 w-3.5" /> Sacar foto
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          capture={capture}
          className="hidden"
          onChange={handleSelect}
        />
      </div>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <Image
              src={value}
              alt={label ?? "Archivo subido"}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-1 flex-col text-sm text-slate-600">
            <span className="text-xs text-slate-400">Vista previa</span>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              onClick={handleLinkClick}
              className="truncate text-slate-600 underline"
            >
              Ver en pestaña nueva
            </a>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={handleClearClick}>
            <Trash2 className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
