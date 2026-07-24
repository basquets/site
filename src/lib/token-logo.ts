export function resolveTokenLogo(sym: string, manifest: Record<string, string>): string | null {
  return manifest[sym.toUpperCase()] ?? null;
}

export function monogram(sym: string): string {
  const cleaned = sym.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.slice(0, 2) || "?";
}
