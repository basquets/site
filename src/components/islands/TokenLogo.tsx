import { monogram, resolveTokenLogo } from "@/lib/token-logo";
import { cn } from "@/lib/utils";

const modules = import.meta.glob<{ default: { src: string } }>(
  "../../assets/tokens/*.svg",
  { eager: true },
);
const MANIFEST: Record<string, string> = {};
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? "";
  const sym = file.replace(/\.svg$/, "").toUpperCase();
  MANIFEST[sym] = mod.default.src;
}

export default function TokenLogo({
  sym,
  size = 22,
  className,
}: {
  sym: string;
  size?: number;
  className?: string;
}) {
  const url = resolveTokenLogo(sym, MANIFEST);
  const style = { width: size, height: size };
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className={cn("rounded-[5px]", className)}
        style={style}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className={cn(
        "inline-flex items-center justify-center rounded-[5px] bg-neutral-100 font-heading font-extrabold text-ink/70",
        className,
      )}
    >
      {monogram(sym)}
    </span>
  );
}
