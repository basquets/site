// Client-side feature flags for gated preview pages (studio, manage, create).
//
// A flag is active when it comes from any of:
//  1. PUBLIC_FLAGS at build time (comma-separated), e.g. an internal staging
//     build with PUBLIC_FLAGS=all
//  2. localStorage (persisted grants)
//  3. a one-time ?flag=studio,manage URL parameter, which persists to
//     localStorage so the grant survives navigation
//
// The special flag "all" unlocks everything. This gates a preview, it is not
// security; real per-wallet access arrives with the waitlist backend.

const KEY = "bq.flags";

const baked = (import.meta.env.PUBLIC_FLAGS ?? "")
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

function stored(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((f) => typeof f === "string") : [];
  } catch {
    return [];
  }
}

export function grantFlags(flags: string[]): void {
  const next = [...new Set([...stored(), ...flags])];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function revokeAllFlags(): void {
  localStorage.removeItem(KEY);
}

/** Resolve a flag; call from the client only (an effect or event handler). */
export function hasFlag(flag: string): boolean {
  const fromUrl = new URLSearchParams(window.location.search).get("flag");
  if (fromUrl) grantFlags(fromUrl.split(",").map((s) => s.trim()));
  const active = new Set([...baked, ...stored()]);
  return active.has(flag) || active.has("all");
}
