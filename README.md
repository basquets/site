# Basquets Site

The [basquets.xyz](https://basquets.xyz) website and protocol documentation — an
[Astro](https://astro.build) app with React islands, Tailwind, and MDX docs.

Basquets is a permissionless basket protocol for tokenized stocks on Robinhood
Chain. The contracts live at
[basquets/contracts](https://github.com/basquets/contracts).

## Structure

```text
src/
  pages/          Routes (landing, baskets, swap, docs, blog, ...)
  components/     Astro components + React islands, shadcn/ui primitives
  content/docs/   Protocol documentation (MDX)
  content/blog/   Blog posts (MDX)
  lib/            Protocol constants, helpers
```

## Development

```sh
bun install
bun run dev
```

Copy `.env.example` to `.env` and point `PUBLIC_API_URL` at a running Basquets
API. Both variables are public client-side values.

```sh
bun test        # unit tests (incl. a fee-drift guard against the contracts repo)
bun run build   # production build
```
