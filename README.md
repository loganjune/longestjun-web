# longest june

A little hub for my projects and the things I'm building. Built with [Astro](https://astro.build) and hosted on Hostinger at https://longestjune.com

## First-time setup (on your Mac)

1. Install Node.js (version 22 or newer): `brew install node`
2. In Terminal, go to this folder and install Astro:
   ```
   cd ~/Documents/GitHub/longestjun-web
   npm install
   ```
   This creates a `node_modules` folder (ignored by Git) and updates `package-lock.json`. **Commit `package-lock.json`**, because the deploy uses it.

## Working on the site

```
npm run dev
```

Then open http://localhost:4321/. The page updates as soon as you save a file. Press Control + C in Terminal to stop.

To publish, commit and push to `main` (for example with GitHub Desktop). Hostinger is linked to this repo: it builds the site (`npm run build`, from the repo root, output `dist`) and puts it live on longestjune.com a minute or two later. You can follow the build under the website's deployments in Hostinger's hPanel. If a change doesn't show up, clear the website's cache in hPanel.

## Editing on the web (no code)

Go to https://longestjune.com/admin and sign in with GitHub. It works on a phone too. You can write notes, add projects (each with its own case-study page), make gallery albums (with a travel story), upload photos and change any text on the site. Drag the grip (⋮⋮) next to any photo or item to reorder it, or drop photos from your computer onto a photo grid. iPhone HEIC photos work, and every photo has an edit button (sliders icon) for cropping, rotating, straightening, filters, black and white, brightness, contrast, saturation, warmth and fade. Adding a single photo opens the editor straight away. On the Gallery screen, new photos can go straight into an album, and single photos can be dragged onto an album to move them in. Tags on stories and albums become filters on the site, and the ★ on an album features it at the top of the Gallery.

- Changes **save themselves** as drafts on GitHub (the `editor-drafts` branch) a couple of seconds after you stop typing; the bottom bar shows "All changes saved". Nothing goes live yet, and drafts are safe even if you close the browser.
- **Publish** (the bar at the bottom of the screen) makes all saved drafts live as one update. The site updates a minute or two later.
- **Discard** throws away drafts that haven't been published.
- Photos are shrunk and converted to WebP on your device before they upload.
- Contact-form messages and content backups are under **Messages** in the editor.
- The older Sveltia editor is still at https://longestjune.com/admin/classic. It saves straight to the live site (no drafts), so prefer the main editor.
- To let someone else edit: on github.com open this repo → **Settings → Collaborators → Add people**. They then sign in to `/admin` with their own GitHub account. Remove them the same way.
- Every change is a commit, so anything can be undone from the repo's history on GitHub.

One-time setup of the sign-in, contact form and database: [docs/admin-setup.md](docs/admin-setup.md).

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

Everything else lives in `src/data/`, one file per part of the site (you can also edit these in the web editor at `/admin`):

- `site.json`: tagline over the video, the Hello line, location, email, GitHub link, and the About page text.
- `projects.json`: the order of projects (the first three are featured on the homepage). Each project is a Markdown file in `src/content/projects/`: details at the top (title, status, year, description, role, tools, link, picture, images), the write-up below. Each gets a page at `/projects/<file-name>`.
- `now.json`: the "Currently" list on the About page.
- `gallery.json`, `shop.json`, `resume.json`: one entry per item. `gallery.json` also lists the album order (`albums`).
- Gallery albums are Markdown files in `src/content/albums/`: details and the photo list at the top, the optional travel story below. Each gets a page at `/gallery/<file-name>`, laid out like a story. Notes and albums with a story are listed together on `/stories`.
- `services.json`: addresses of the contact-form API and editor sign-in helper, and the spam-check site key (all public, no secrets).

`picture` is a built-in drawing (`sea`, `room`, `pool`, `wall`, `dune`, `dusk`). To use your own image instead, set `photo` to an image under `public/images/`, for example `"/images/your-file.jpg"`.

Keep the quotes and commas in these files exactly as they are. If the build fails after an edit, paste the file into https://jsonlint.com to find the mistake.

## Where things live

| What | File |
| --- | --- |
| Page layouts | `src/pages/*.astro` |
| Top bar, menu, footer | `src/layouts/Layout.astro` |
| Colours, fonts, spacing | `src/styles/global.css` |
| Homepage video | `public/hero.mp4` (poster: `public/hero.jpg`) |
| Built-in drawings | `src/lib/scene.ts` |

The site's address is set by `site` in `astro.config.mjs`. If the domain ever changes, update it there.

Contact: longestjune@gmail.com · [github.com/loganjune](https://github.com/loganjune/)
