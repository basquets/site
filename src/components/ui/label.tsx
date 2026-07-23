import type * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: generic primitive; callers supply htmlFor/children per usage
    <label
      className={cn("block text-xs text-ink/70 mb-1.5", className)}
      {...props}
    />
  );
}
