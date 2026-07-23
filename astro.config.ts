import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";

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
