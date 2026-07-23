import type { TokenMarket } from "./use-live-market";

/**
 * What a price-dependent surface shows when it has no real numbers.
 *
 * The site never renders a simulated price, so "we could not price this" has to
 * be a visible state rather than a plausible-looking placeholder value.
 */
export function marketMessage(
  mode: TokenMarket["mode"],
  subject = "Live prices",
): string {
  // Colon form so any subject reads correctly, singular or plural, without
  // mangling capitalisation like "NAV".
  return mode === "unavailable"
    ? `${subject}: unavailable right now.`
    : `${subject}: loading…`;
}

export default function AwaitingMarket({
  mode,
  subject,
  className = "",
}: {
  mode: TokenMarket["mode"];
  subject?: string;
  className?: string;
}) {
  return (
    <p
      className={`m-0 py-8 text-[13px] text-ink/55 ${className}`}
      aria-live="polite"
    >
      {marketMessage(mode, subject)}
    </p>
  );
}
