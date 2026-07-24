import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
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
  // Marketing root: coming-soon landing, Genesis demo, docs, blog.
  site: "https://basquets.xyz",
  integrations: [mdx(), sitemap(), ...sentryIntegration],
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
      [rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }],
    ],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
