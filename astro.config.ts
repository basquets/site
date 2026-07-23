import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import sentry from "@sentry/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import { loadEnv } from "vite";

// Client-side error tracking. astro.config runs in Node before Vite loads the
// .env files, so process.env does NOT hold PUBLIC_* here — read them with Vite's
// loadEnv instead. `astro build` -> production mode picks up .env.production;
// `astro dev` and CI (no DSN present) build without Sentry, so dev errors never
// reach the production project. Source-map upload stays off (needs an auth
// token; minified traces are enough for a static site).
const mode = process.argv.includes("build") ? "production" : "development";
const env = loadEnv(mode, process.cwd(), "PUBLIC_");
const sentryDsn = env.PUBLIC_SENTRY_DSN;
const sentryIntegration = sentryDsn
  ? [
      sentry({
        dsn: sentryDsn,
        environment: env.PUBLIC_SENTRY_ENVIRONMENT ?? "production",
        sourceMapsUploadOptions: { enabled: false },
      }),
    ]
  : [];

export default defineConfig({
  // Placeholder domain until the real one is registered — update when known.
  site: "https://basquets.xyz",
  integrations: [
    react(),
    mdx(),
    // Gated preview pages stay out of the sitemap.
    sitemap({
      filter: (page) => !/\/(studio|manage|create)\/$/.test(page),
    }),
    ...sentryIntegration,
  ],
  // Shiki with the css-variables theme: token colors come from the Modernist
  // ramp defined in global.css (--astro-code-*), so code blocks stay on-brand.
  markdown: {
    syntaxHighlight: "shiki",
    shikiConfig: { theme: "css-variables" },
    rehypePlugins: [
      rehypeHeadingIds,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          properties: { className: ["heading-anchor"], ariaHidden: true, tabIndex: -1 },
          content: { type: "text", value: "#" },
        },
      ],
      [
        rehypeExternalLinks,
        { target: "_blank", rel: ["noopener", "noreferrer"] },
      ],
    ],
  },
  // fs.allow: the docs content collection loads from ../docs (repo root).
  // ssr.noExternal: bundle the workspace api-client package instead of trying
  // to resolve it as an external node module during SSR.
  vite: {
    plugins: [tailwindcss()],
    server: { fs: { allow: [".."] } },
    ssr: { noExternal: ["@basquets/api-client"] },
  },
});
