# longest june

A little hub for my projects and the things I'm building. Built with [Astro](https://astro.build) and published with GitHub Pages at https://loganjune.github.io/longestjun-web/

## First-time setup (on your Mac)

1. Install Node.js (version 22 or newer): `brew install node`
2. In Terminal, go to this folder and install Astro:
   ```
   cd ~/Documents/GitHub/longestjun-web
   npm install
   ```
   This creates a `node_modules` folder (ignored by Git) and a `package-lock.json` file. **Commit `package-lock.json`**, because the deploy uses it.
3. On github.com, open the repo → **Settings → Pages → Source → GitHub Actions**. This only has to be done once.

## Working on the site

```
npm run dev
```

Then open http://localhost:4321/longestjun-web/. The page updates as soon as you save a file. Press Control + C in Terminal to stop.

To publish, commit and push to `main` (for example with GitHub Desktop). The workflow in `.github/workflows/deploy.yml` builds the site and puts it live in a minute or two. You can watch it in the repo's **Actions** tab.

## Adding a note

Create a new file in `src/content/notes/`, for example `first-swim.md`:

```md
---
title: First swim of the year
date: 2026-12-01
description: Too cold, obviously.
---

Write the note here in Markdown. **Bold**, _italics_, [links](https://example.com),
lists, quotes and headings all work.

![The beach at 7am](./first-swim.jpg)
```

- The file name becomes the address: `first-swim.md` → `/notes/first-swim`.
- `description` is optional.
- For photos in a note, put the image file next to the note in `src/content/notes/` and link it with `./file-name.jpg`, as above. Astro resizes and optimises it for you.
- Add `draft: true` to keep a note off the live site while you work on it. Drafts still show in `npm run dev`.
- Notes are listed newest first, and the three newest show on the homepage.

## Editing everything else

`src/data/site.json` holds the rest of the content:

- `site`: tagline over the video, the Hello line, location, email and GitHub link.
- `projects`: `title`, `status` (`Building`, `Shipped` or `Idea`, which drive the filters), `year`, `description`, `picture` and an optional `link`. The first three are featured on the homepage.
- `now`: the "Currently" list on the About page.
- `gallery`, `shop`, `resume`: one entry per item.

`picture` can be a built-in drawing (`sea`, `room`, `pool`, `wall`, `dune`, `dusk`), or your own image: put the file in `public/images/` and use `"images/your-file.jpg"`.

Keep the quotes and commas in `site.json` exactly as they are. If the build fails after an edit, paste the file into https://jsonlint.com to find the mistake.

## Where things live

| What | File |
| --- | --- |
| Page layouts | `src/pages/*.astro` |
| Top bar, menu, footer | `src/layouts/Layout.astro` |
| Colours, fonts, spacing | `src/styles/global.css` |
| Homepage video | `public/hero.mp4` (poster: `public/hero.jpg`) |
| Built-in drawings | `src/lib/scene.ts` |

If you rename the repo, change `base` in `astro.config.mjs` to match.

Contact: longestjune@gmail.com · [github.com/loganjune](https://github.com/loganjune/)
