# Editing the site

Run `hugo server -D` for a local preview with drafts, or `hugo` for a production build.

Edit the introduction in `content/_index.md` and articles in `content/posts/`. Report folders contain both the Markdown and its PDF. Use `hugo new content posts/my-post.md` to start a post and set `draft: false` when ready.

The site uses blog@tuan. For maths, use `$...$` inline or `$$...$$` for display. Add `categories: ["Quantum Chaos"]` to a post’s front matter to list it under that category.

## Navigation and headings

- Edit `content/research.md` for the Research introduction and topic list. Each topic points to a Hugo page, such as `/categories/quantum-chaos`. Assign posts to the topic using the `categories` field in their front matter.
- To add a Teaching or Publications landing page, create a Markdown page under `content/` with `layout: "landing"` and a `topics` list like the Research page. Add a menu entry in `hugo.toml` when you want it in the header.

- Edit the `title` in `content/posts/_index.md` for the heading on the Posts page. Edit `content/archive.md` for the Archive heading.
- Edit the `[[menus.main]]` entries in `hugo.toml` for navigation labels, destinations and order. Lower `weight` values appear first. Entries with `parent = "research"` appear inside the Research dropdown.
- Edit `.nav-dropdown a` in `assets/css/custom.css` for the dropdown links’ font size and padding. Use `.nav-dropdown__label` for the Research label and `.nav-dropdown ul` for the panel.
- Edit `layouts/partials/header.html` for the header structure and `assets/js/research-menu.js` for how the Research menu opens and closes.

## Colours

Edit the variables at the top of `assets/css/custom.css`. The variable `--prose-link-color` follows the theme’s heading hover blue via `var(--accent-ink)`. Set `--quantum-chaos-color` and `--membrane-mechanics-color` to change the research links. In `light-dark(light, dark)`, the first colour is for light mode and the second is for dark mode.
