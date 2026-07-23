import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-start gap-1.5 text-left font-heading font-extrabold text-sm leading-tight cursor-pointer border border-transparent transition-colors active:translate-y-px disabled:opacity-45 disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-ground hover:bg-accent-600 active:bg-accent-700",
        secondary: "border-divider hover:bg-ink/7 active:bg-ink/14",
        ghost: "text-accent hover:bg-accent/10 active:bg-accent/18",
        inverse:
          "text-ground border-ground hover:bg-ground/15 active:bg-ground/25",
      },
      size: {
        default: "px-3.5 py-2",
        lg: "px-5.5 py-3.5 text-base",
        block: "w-full px-3.5 py-2",
      },
    },
    compoundVariants: [{ variant: "ghost", class: "px-1" }],
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

// In .astro files, style anchors with cn(buttonVariants({...})) directly. Slot/asChild
// cannot clone Astro-slotted static HTML, so classes are silently dropped. asChild works only inside React islands.
export { buttonVariants };
