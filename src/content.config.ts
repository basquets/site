import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const article = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

// Docs live in src/content/docs; `order` drives the sidebar and prev/next
// navigation.
const doc = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number(),
});

export const collections = {
  blog: defineCollection({
    loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
    schema: article,
  }),
  docs: defineCollection({
    loader: glob({ pattern: "*.mdx", base: "./src/content/docs" }),
    schema: doc,
  }),
};
