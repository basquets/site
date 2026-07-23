import type * as React from "react";
import { cn } from "@/lib/utils";

export function Separator({ className, ...props }: React.ComponentProps<"hr">) {
  return (
    <hr className={cn("h-0.5 border-0 bg-divider", className)} {...props} />
  );
}
