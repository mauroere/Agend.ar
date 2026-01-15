"use client";

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
  className?: string; // Allow custom styling
};

export function UploadDropzone({
  label,
  description,
  value,
  folder = "public",
  accept = "image/*,video/*",
  capture,
  onChange,
  className,
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
    <div className={cn("space-y-3", className)}>
      {label ? <p className="text-sm font-medium text-slate-700">{label}</p> : null}

      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <div
            className="relative flex min-h-[200px] w-full cursor-pointer items-center justify-center bg-slate-100"
            onClick={triggerSelect}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDrop={handleDrop}
          >
            {/* Check for video extension roughly */}
            {value.match(/\.(mp4|webm|mov)$/i) ? (
              <video src={value} controls className="max-h-[400px] w-full object-contain" />
            ) : (
              // Use img to ensure flexibility with remote URLs without strict Next.js Image config
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="Preview" className="max-h-[400px] w-full object-contain" />
            )}

            {/* Overlay for actions */}
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100",
                uploading && "cursor-wait opacity-100"
              )}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerSelect();
                    }}
                  >
                    Cambiar imagen
                  </Button>
                </div>
              )}
            </div>
          </div>

          {!uploading && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              onClick={handleClearClick}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center transition hover:bg-slate-50",
            dragging && "border-slate-500 bg-slate-100"
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
        </div>
      )}

      {/* Hidden Input */}
      <input ref={inputRef} type="file" accept={accept} capture={capture} className="hidden" onChange={handleSelect} />

      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}
