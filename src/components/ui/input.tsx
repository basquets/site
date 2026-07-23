import type * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full min-h-9 px-2.5 py-1.5 text-sm bg-surface text-ink caret-accent",
        "border border-divider hover:border-ink/45 focus-visible:border-accent focus-visible:outline-offset-0",
        className,
      )}
      {...props}
    />
  );
}
