# Editing the site

## Where things live

| What to edit | File or folder |
| --- | --- |
| Site homepage introduction | `content/_index.md` |
| Research overview and its topic links | `content/research.md` |
| Quantum Chaos introduction | `content/posts/quantum-chaos/_index.md` |
| Quantum Chaos posts | `content/posts/quantum-chaos/` |
| Membrane Mechanics introduction | `content/posts/membrane-mechanics/_index.md` |
| Membrane Mechanics posts | `content/posts/membrane-mechanics/` |

Hugo adds the post list below each topic introduction automatically, newest first. The site's Posts page gathers posts from both folders. The underscore matters: `_index.md` describes a section, while `index.md` inside an article folder is the article itself.

## Create a post

1. Choose the topic folder. Use a single Markdown file for a text-only post. Use an article folder with `index.md` for posts with PDFs, videos or images that belong to that article.
2. From the project root, run one of these commands with your own article name.

   ```powershell
   # Text-only post
   hugo new content posts/quantum-chaos/spectral-statistics.md

   # Post with media
   hugo new content posts/membrane-mechanics/eversion-demo/index.md
   ```

3. Fill in the front matter at the top of your Markdown file. The folder controls the topic homepage list. The matching `categories` value controls the category badge and category archive. Use `tags` for additional subjects.

   ```yaml
   ---
   title: "A membrane eversion demo"
   date: 2026-11-24
   draft: true
   categories: ["Membrane Mechanics"]
   tags: ["Animations"]
   summary: "A short description for the post listings."
   ---
   ```

   For a quantum chaos post, use `categories: ["Quantum Chaos"]`. Set `date` to the date you want the post sorted by. Write the article below the closing `---`.

4. For an article folder, put its media beside `index.md` and refer to each file by its name. Shared images can live in `static/images/` and be linked as `/images/filename.jpg`.

   ```markdown
   [Read the report (PDF)](report.pdf)

   ![Illustration of membrane eversion](eversion.gif)

   <video controls playsinline preload="metadata" style="max-width: 100%; height: auto;">
     <source src="eversion.mp4" type="video/mp4">
     <a href="eversion.mp4">Download the video</a>
   </video>
   ```

   For maths, use `$...$` inline or `$$...$$` for display. Add `toc: true` in the front matter if you want a table of contents for a longer article.

5. Run `hugo server -D` to preview with drafts at `http://localhost:1313/`. When the post is ready, set `draft: false` and run `hugo` to check the production build before committing and pushing.

## Edit a post

Open its Markdown file and edit the text, title or summary. Keep the filename or article folder name stable after publication so existing links continue to work. Some imported posts have an explicit `url` in their front matter to preserve their original addresses. Keep that field when editing those posts.

## Navigation and headings

- Edit `content/research.md` for the Research introduction and topic list. Each topic points to a Hugo page, such as `/posts/quantum-chaos`.
- To add a Teaching or Publications landing page, create a Markdown page under `content/` with `layout: "landing"` and a `topics` list like the Research page. Add a menu entry in `hugo.toml` when you want it in the header.

- Edit the `title` in `content/posts/_index.md` for the heading on the Posts page. Edit `content/archive.md` for the Archive heading.
- Edit the `[[menus.main]]` entries in `hugo.toml` for navigation labels, destinations and order. Lower `weight` values appear first. Entries with `parent = "research"` appear inside the Research dropdown.
- Edit `.nav-dropdown li a` in `assets/css/custom.css` for the dropdown links’ font size and padding. Use `.nav-dropdown__label` for the Research label and `.nav-dropdown ul` for the panel.
- Edit `layouts/partials/header.html` for the header structure and `assets/js/research-menu.js` for how the Research menu opens and closes.

## Colours

Edit the variables at the top of `assets/css/custom.css`. The variable `--prose-link-color` follows the theme’s heading hover blue via `var(--accent-ink)`. Set `--quantum-chaos-color` and `--membrane-mechanics-color` to change the research links. In `light-dark(light, dark)`, the first colour is for light mode and the second is for dark mode.
