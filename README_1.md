# longest june

A little hub for my projects and the things I'm building.

## Files

- `index.html`: the whole site (design, pages and the homepage video).
- `content.json`: everything you'd want to edit (text, projects, notes, gallery, shop, resume).

Host it with GitHub Pages (Settings → Pages → Deploy from branch → `main` / root). It will be live at https://loganjune.github.io/longestjun-web/

To preview on your computer, run `python3 -m http.server 8000` in this folder and open http://localhost:8000. Opening `index.html` by double-clicking won't read `content.json`; it shows the built-in copy instead.

## Editing content.json

- `site`: the tagline over the video, the Hello line, your location, email and GitHub link.
- `projects`: `title`, `status` (`Building`, `Shipped` or `Idea`, which drive the filters), `year`, `description`, `picture` and an optional `link`. The first three appear in the big featured section on the homepage.
- `notes`: `date`, `title` and an optional `link`. The first three show on the homepage.
- `now`: the "Currently" list on the About page.
- `gallery`: `picture` and `caption`.
- `shop`: `name`, `price`, `details` and `picture`.
- `resume`: sections, each with `items` of `title`, `details` and `years`.

`picture` can be one of the built-in drawings (`sea`, `room`, `pool`, `wall`, `dune`, `dusk`), or a path to your own image, such as `images/my-project.jpg` (put the file in an `images` folder next to `index.html`).

Keep the quotes and commas exactly as they are; a missing comma breaks the file. If the site shows the old text after an edit, paste the file into https://jsonlint.com to find the mistake.

Contact: longestjune@gmail.com · [github.com/loganjune](https://github.com/loganjune/)
