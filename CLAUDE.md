# longest june: project notes for Claude

Personal portfolio site, "a little hub for my projects and the things I'm building". Owner: GitHub `loganjune`, email longestjune@gmail.com, based in Marina del Rey, CA.

- Stack: Astro 7 static site, plain CSS, Node 22+. React 19 (via `@astrojs/react`, versions pinned exactly) is used only for small interactive islands in `src/components/react/`: `PhotoGallery` (gallery and album grids + full-screen viewer on a sand background, never black), `ProjectsFilter` (Projects page), `Daylight` (homepage sunrise/sunset for Marina del Rey, maths in `src/lib/sun.ts`, `client:only`). Everything else is plain Astro; the editor in `src/admin/` is vanilla TypeScript. Built-in drawings in React use `Picture.tsx`, which passes a `useId` prefix to `scene()` so SVG ids stay unique.
- Repo: `loganjune/longestjun-web`. The spelling is intentional, without the "e"; don't rename. Default branch `main`. The project lives at the repo root.
- Live URL: https://longestjune.com (`site: 'https://longestjune.com'` in `astro.config.mjs`, no `base`; the site is served from the domain root).
- Hosting: Hostinger, set up as a Node.js website linked to this GitHub repo. Hostinger builds from the repo root (`npm run build`, output `dist`) and auto-deploys on every push to `main`. After a deploy, purge the Hostinger cache if changes don't show. There is no GitHub Pages / GitHub Actions deploy any more.
- Commit `package-lock.json`.

## Commands

- `npm install`, then `npm run dev` → http://localhost:4321/
- `npm run build` / `npm run preview`

## Status (Nov 18 2026)

- The Astro site builds cleanly and is live on longestjune.com (first live build from commit a2d19b0). Every page was checked in the browser against the design below, on desktop and phone widths.
- Projects, notes, gallery, shop and resume entries are **sample content** (the footer says so). The owner hasn't supplied real projects yet. Don't invent credentials or work history for them.
- Web editing (set up and live as of Nov 18 2026; sign-in helper `https://sveltia-cms-auth.cool-cake-0b50.workers.dev`, API `https://longestjune-api.cool-cake-0b50.workers.dev`, GitHub App client ID `Iv23li2W8TGvhO5ocTWc`):
  - `/admin`: the custom editor (vanilla TS in `src/admin/`, page `src/pages/admin/index.astro`), styled like the site. GitHub sign-in through the `sveltia-cms-auth` worker (popup handshake in `src/admin/auth.ts`, token in sessionStorage only). It talks to the GitHub API directly (`src/admin/github.ts`): Changes **autosave** (about 2 s after the last edit, via `saveBar` in `src/admin/forms.ts`) as commits on the `editor-drafts` branch; new items wait until their title is set and the title box is left, then save in place (URL updated with `history.replaceState`, no re-render). Leaving a screen or publishing flushes pending saves first. **Publish** merges any outside changes from `main` into drafts, then puts one squashed commit on `main` with the drafts' tree ("Publish: …") and resets drafts to it; **Discard** resets drafts to `main`. Hostinger only builds `main`.
    - Notes and album stories use TipTap 3.32.2 (pinned exact) with `@tiptap/markdown`, so files stay plain Markdown (`src/admin/richtext.ts`). Headers are written as JSON-valued YAML by `src/admin/frontmatter.ts`.
    - Gallery, albums and projects are React screens (`src/admin/react/`, data layer in `src/admin/albums.ts` and `src/admin/projects.ts`): photo grids with drag-to-reorder (`src/admin/sortable.ts`, grip handle + arrow keys), captions, cover star, drop files to upload, a photo editor (`src/admin/cropper.ts`: crop, rotate, straighten, and looks from `src/admin/look.ts`: filters, B&W, brightness, contrast, saturation, warmth, fade; pixel maths on canvas, preview on a ≤1000 px copy; opens automatically when a single photo is added), confirm before removing. On the Gallery screen, adding photos asks where they go (single photos or an album), and a single photo can be dragged onto an album card or use "Move to album"; one Save writes gallery.json and the changed albums. HEIC photos are converted with `heic-to` (1.6.7, lazy-loaded only when a HEIC file is picked). Other sections are schema-driven forms (`src/admin/sections.ts` + `src/admin/forms.ts`), also with grip handles. Keep all of these in sync with the content files. The editor page includes `ReactReady` (an empty React island) so React works on it in `npm run dev`.
    - Photos are converted to WebP ≤2400px in the browser and stored under `public/images/<section>/`; the editor previews draft-only photos by fetching them from GitHub.
    - Messages and backups (from the API) are a screen in the editor; `/admin/messages` redirects there.
  - `/admin/classic`: the old Sveltia CMS, kept as a backup. Its config is `src/pages/admin/config.yml.ts`. It saves straight to `main` and doesn't know about albums.
  - Gallery albums: `src/content/albums/<id>.md` (title, location, date, description, cover, draft, photos[{photo, caption}], body = travel story). Album pages are laid out as stories (`StoryHead.astro`, reading column) followed by a photo-book grid (`PhotoGallery layout="book"`). Gallery page: the featured album large at the top, showing only a small "Featured album" label and its name over the photo on hover (`featured` in `src/data/gallery.json`, set with the album's "Feature at the top" switch or the ★ on its card in the editor; one at a time), then the other albums as cover cards (name over the cover on hover) with a tag filter (React `AlbumsIndex`), then single photos (captions on hover; small underneath on touch screens). Owner's choice, Nov 19 2026. Album order is `albums` in `src/data/gallery.json` (`src/lib/albums.ts`).
  - Stories (`/stories`, `src/lib/stories.ts`, React `StoriesIndex`): notes plus albums that have a story, newest first, featured story + cards + a tag filter built from tags in use (`tags` on notes and albums; untagged notes count as Notes, untagged travel stories as Travel). The editor calls notes "Stories" (screens, buttons); files and URLs stay `notes`. `/notes` redirects there; notes keep their `/notes/<id>` pages (story layout, optional `cover`).
  - Projects are case studies: `src/content/projects/<id>.md` (title, status, year, description, role, tools, link, picture/photo, images, draft, body = write-up); order in `src/data/projects.json` (`order`; first three featured on the homepage). `/projects` = case-study rows (React `ProjectsFilter`), `/projects/<id>` = case-study page. Inspired by tiffanynewman.com (rows, photo-book) and owiu-goods.com/stories (story index/pages), in this site's palette.
  - `worker/`: Cloudflare Worker `longestjune-api` + D1 database (`worker/schema.sql`). Contact form (Turnstile + honeypot, email alert via Resend), messages API, hourly backup of notes and `src/data/*.json` into D1. Editor-only endpoints accept the GitHub token and check push access to the repo; no passwords stored. Secrets (`TURNSTILE_SECRET`, `RESEND_API_KEY`) are set with `wrangler secret put`, never committed. The sign-in helper's own code lives outside the repo (`../sveltia-cms-auth`, deployed with wrangler; secrets `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ALLOWED_DOMAINS`).
  - `src/data/services.json` holds the public URLs/keys (`apiUrl`, `authUrl`, `turnstileSiteKey`). While empty, the contact form keeps telling people to email instead, and `/admin/messages` says it isn't set up. Don't fake either.
- The shop buttons say "Coming soon". Don't fake them.
- Owner's choices: Git for content plus a database (D1) for contact messages, content backups, and future sign-ups/orders (`signups` table exists, unused). Sign-in without 2FA but recoverable (GitHub's own recovery). Several people may edit (GitHub collaborators). Email alert on new messages.
- `archive-content json/` holds the owner's earlier content export; leave it alone unless asked.

## Structure

- `src/pages/`: index, about, stories, projects (+ [id]), notes/[id], gallery (+ [album]), resume, shop, contact, 404, admin.
- `src/content/notes/*.md`: notes collection (`src/content.config.ts`, glob loader). Frontmatter: `title`, `date`, optional `description`, optional `cover`, `draft` (hidden in production). The file name is the URL id.
- `src/data/*.json`: everything else editable, one file each: `site` (tagline, hello, location, email, github, about), `projects` (only the order), `now`, `gallery`, `shop`, `resume`, `services`. Pages import them through `src/lib/content.ts` (`pic()` picks `photo` over `picture`). The first 3 projects are featured on the homepage.
- `src/components/PageHead.astro`: the big page title + Japanese label row used by every inner page.
- `src/components/Pic.astro`: `picture` is either a built-in drawing name (`sea room pool wall dune dusk`, generated SVG in `src/lib/scene.ts`) or an image path under `public/images/`.
- `src/lib/url.ts`: `url()` prefixes the base path (now just `/`). Keep using it for internal links and assets so the site still works if a base path is ever added again. `PAGES` drives the menu, footer and explore lists.
- `src/layouts/Layout.astro`: head, fixed top bar, full-screen menu, footer, plus client scripts (menu, top-bar state, `.fit` text sizing).
- `public/hero.mp4` / `hero.jpg`: homepage video and poster.

## Design (decided with the owner; keep it)

- Reference: owiu-design.com. Minimal and Japanese-studio-like: full-bleed pictures, giant uppercase serif capitals, small tracked uppercase labels, two-column "label left / content right" rows divided by hairlines with → arrows.
- Colours: pale pink-sand ground `#f3e6dc`, warm brown ink `#3a2c27`, soft `#7d6a62`, rules `#3a2c2729`. Light blue and pink live only in the pictures. One fixed palette, no dark mode. The owner explicitly rejected a black background.
- Type: Marcellus (display capitals), STIX Two Text (statements/body; replaced EB Garamond on Nov 18 2026 because the owner wanted something "a little more scientific, small, put together"), Jost (labels and all dates, in small tracked capitals), Shippori Mincho (Japanese). Small Japanese labels per page (自己紹介, 制作, 記録, 写真, 経歴, ショップ, 連絡), 夏至 down the hero, and 水無月 in the footer.
- Pictures show at 80% opacity over the sand ("dreamy"); the hero video at 92%.
- Hero: the video plays **once** (no loop) and rests on its last frame. A round outlined play/pause **icon** button (no words) sits under the tagline on the video; it must not be in the top bar. "LONGEST JUNE" across the bottom, sized by JS to fit the width. Keep it high enough that the J's tail isn't clipped. Respect autoplay blocking (play on first pointerdown).
- Top bar: Menu at top-left, GitHub + Contact at top-right, fixed while scrolling. Clear with white text over the hero, then a sand bar with blur once past it.
- Home order: hero → Hello ("Named after the longest day of the year, when the sun sets late and there's always time for one more thing.") → Location (outlined map-pin SVG icon, **not** an emoji) → Explore index → featured project slider → recent notes.
- Buttons (owner's choice, Nov 18 2026): the one main action is a solid dark pill; secondary actions are plain underlined text; icon-only controls are round outlined buttons. Applies to the site (`.btn`) and the editor (`.ed-btn.solid` vs `.ed-btn`).
- Layout: never put a two-column list inside the right half of a two-column row (it leaves a big empty left half). Use `.facts`: the section label on top, then rows where each row's own label sits in the left column and its text in the wide right column (About, Resume, homepage Recent notes).
- Avoid: emoji icons, words where an icon was asked for, looping video, dark backgrounds.

## Working with the owner

New to the terminal, git and Node, so give exact commands, one step at a time. A VPN on their Mac has caused failed downloads before; suggest turning it off if installs hang. They use GitHub Desktop to commit and push. The Claude GitHub connector currently has read-only access to the repo, so the owner commits changes themselves.
