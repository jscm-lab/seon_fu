import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
        blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
        gray: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200",
        green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      },
    },
    defaultVariants: { tone: "gray" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
