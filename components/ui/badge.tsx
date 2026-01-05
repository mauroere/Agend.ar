import { cn } from "@/lib/utils";

const COLOR_MAP: Record<string, string> = {
  pending: "bg-status-pending/10 text-status-pending",
  confirmed: "bg-status-confirmed/10 text-status-confirmed",
  risk: "bg-status-risk/10 text-status-risk",
  canceled: "bg-status-canceled/10 text-status-canceled",
  noshow: "bg-status-noshow/10 text-status-noshow",
  attended: "bg-status-attended/10 text-status-attended",
};

export function Badge({
  label,
  color = "pending",
}: {
  label: string;
  color?: keyof typeof COLOR_MAP;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        COLOR_MAP[color] ?? COLOR_MAP.pending,
      )}
    >
      {label}
    </span>
  );
}
