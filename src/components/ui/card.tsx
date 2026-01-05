import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.4)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
