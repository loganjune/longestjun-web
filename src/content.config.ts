import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Each note is a Markdown file in src/content/notes/. The file name becomes its URL:
// src/content/notes/first-swim.md  ->  /notes/first-swim
const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// Each gallery album is a Markdown file in src/content/albums/. The file name becomes its URL:
// src/content/albums/lisbon.md  ->  /gallery/lisbon
// The details and photo list sit at the top; the optional travel story is the text below.
const albums = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/albums' }),
  schema: z.object({
    title: z.string(),
    location: z.string().optional(),
    description: z.string().optional(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
    photos: z.array(z.object({ photo: z.string(), caption: z.string().default('') })).default([]),
  }),
});

export const collections = { notes, albums };
