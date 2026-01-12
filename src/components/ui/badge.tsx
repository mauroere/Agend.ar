import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Custom Status Variants
        pending: "border-transparent bg-status-pending/10 text-status-pending hover:bg-status-pending/20",
        confirmed: "border-transparent bg-status-confirmed/10 text-status-confirmed hover:bg-status-confirmed/20",
        risk: "border-transparent bg-status-risk/10 text-status-risk hover:bg-status-risk/20",
        canceled: "border-transparent bg-status-canceled/10 text-status-canceled hover:bg-status-canceled/20",
        noshow: "border-transparent bg-status-noshow/10 text-status-noshow hover:bg-status-noshow/20",
        attended: "border-transparent bg-status-attended/10 text-status-attended hover:bg-status-attended/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
