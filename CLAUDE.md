# basquets/site

The basquets.xyz Astro site and protocol docs. Runs on bun; UI uses shadcn/ui
primitives — reuse existing components before creating new ones.

- **Docs** are MDX in `src/content/docs/` (frontmatter: `title`, `description`,
  `order` — `order` drives the sidebar and prev/next).
- **`@basquets/api-client`** comes from npm. When the API changes, its
  maintainers publish a new version; bump it here and run `bun install`.
- **Fee-drift guard:** `src/lib/protocol.test.ts` parses `FeeController.sol`
  from the public [basquets/contracts](https://github.com/basquets/contracts)
  repo so displayed rates can't go stale. Set `FEE_CONTROLLER_SRC` to a local
  checkout to test against unpushed contract changes.
- **Checks:** `bun test`, then `bun run check` (biome + astro check + build).
  CI runs both on every push/PR — run them before pushing.
- `.env` holds only public values (`PUBLIC_API_URL`, `PUBLIC_PRIVY_APP_ID`);
  copy from `.env.example`. Never add server-side secrets to this repo — it is
  public and the site is static.
