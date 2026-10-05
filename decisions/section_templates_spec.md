# Section Templates — Agreed Spec

Result of the template review and design interview. Nothing has been implemented yet, apart from the icebox entries.

## Problems Found in the Current Code

| # | Problem | Where |
|---|---------|-------|
| 1 | `content_types` mixes entry types (`post`, `page`) with section templates, so "Add Section…" offers `post` and `page` as sections | [Editor.tsx:432](file:///Users/ryan/Code/zygodactyl/static-site/packages/admin-ui/src/pages/Editor.tsx#L432) |
| 2 | **Section-built pages render blank.** The Editor saves `body_html: ""` and the page template only outputs `page.body_html` | [views.rs:641-712](file:///Users/ryan/Code/zygodactyl/static-site/packages/public-worker/src/views.rs#L641-L712) |
| 3 | `template_css` is stored but never reaches the public site | public-worker (no references) |
| 4 | **One invalid template returns an error for every page.** `create_env` uses `?` on `add_template`, and template HTML isn't compiled on save | [views.rs:294-319](file:///Users/ryan/Code/zygodactyl/static-site/packages/public-worker/src/views.rs#L294-L319) |
| 5 | Delete protection is a hardcoded id check, and the UI still shows Delete for post/page | [content_type.rs:177](file:///Users/ryan/Code/zygodactyl/static-site/packages/admin-api-worker/src/handlers/content_type.rs#L177) |
| 6 | Deleting a template doesn't check whether pages still use it | same file |
| 7 | Section fields only support `boolean`, `image`, and a single-line text box | Editor.tsx |
| 8 | Dead files: `public/page-builder.js`, `replace_editor.py`, `replace_editor.ts`, `check_out.txt` | repo |

## Decisions

### Data model
- **Post and page don't use templates from the database.** Their layouts stay in Rust (`DEFAULT_POST`, `DEFAULT_PAGE`) and are not shown or editable in the admin.
  - Posts always use the post layout with a TipTap body and no sections.
  - Pages always use the page layout with sections only.
- **New `section_templates` table** replaces `content_types`. It's sections-only. `content_types` is removed now, since nothing is in production.
- **Squash migrations** into a single `0001_initial_schema.sql` that includes `section_templates` and seeds the 10 built-ins. Local and remote D1 both need a one-time reset.
- All queries list explicit columns (no `SELECT *`). Shared structs use `#[serde(default)]`.

### Built-in sections (seeded)
Hero · Text · Text + Image · Gallery · Image Carousel (CSS scroll-snap, no JS) · Call to Action · Feature Grid · Testimonial / Quote · FAQ (native `<details>`) · Video Embed

- Built-ins can be **fully edited and deleted** like any custom template. The hosted template store for restoring them is in the icebox.
- They keep the existing `is_locked` behavior: designers can't edit locked templates, and admins can toggle the lock.

### Field types (stored in `schema_json`, no new DB columns)
`text` · `textarea` · `richtext` · `url` · `boolean` · `image` · `select` (requires `options`) · `list` (requires `fields`, one level only, no nested lists)

### Rich text
- One shared `<RichTextEditor>` component (`@tiptap/react` + StarterKit + Image + Link) used for **both the post body and section `richtext` fields**.
- Stored as **HTML** and sanitized server-side with the existing `sanitize.rs`. Rendered in MiniJinja with `|safe`.

### Rendering (public worker)
- For each section in the page's `body_json`, render its template with `section.data` as context, concatenate the results, and output them in the page layout.
- **Skip** any section whose template is missing or fails to compile. Never fail the whole page.
- `create_env` skips broken templates instead of returning an error.
- **CSS:** inline only the `template_css` of sections used on that page, in a `<style>` tag in `<head>`.
- New `video_embed` MiniJinja filter: YouTube links become `youtube-nocookie.com/embed/…`, Vimeo links become `player.vimeo.com/video/…`, and anything else becomes an empty string.

### Cache invalidation
- Saving or deleting a template purges every page that uses it, plus `/`, `/rss.xml`, and `/sitemap.xml`. Pages are found with the existing `body_json LIKE` usage lookup.

### Delete safety
- Deleting a template that live (non-trashed) pages use is blocked with **409** and a usage count, e.g. "Used on 3 pages".
- The Editor shows orphaned sections as **"Missing template"** so they can be removed.

### Template editor
- A **visual field builder** replaces the raw JSON textarea: add a field, pick its type, set label and required, add options for `select`, and nested sub-fields for `list`.
- **Server-side validation** via a shared `validate_template(html, schema)` function in `zygo-core`, run on save:
  - ❌ **Block:** MiniJinja syntax errors
  - ❌ **Block:** top-level variables in the HTML that aren't schema fields. MiniJinja built-ins like `loop` are allowed.
  - ❌ **Block:** invalid schema (unknown type, missing `name`, `select` without `options`, `list` without `fields`, nested lists)
  - ⚠️ **Warn:** schema fields never used in the HTML. The user can confirm and save anyway.
  - ⚠️ **Warn only:** `list` sub-fields inside loops (strict validation is in the icebox)

### Page editor
- Sections are added from a dropdown that lists only section templates.
- List-field items get up / down / remove buttons and "+ Add item" through a small `<ListField>` component. No drag-and-drop library.

### API
- `/api/content-types` becomes `/api/section-templates`. Handlers live in `src/handlers/`, and auth uses `auth_required!`.

### Cleanup
- Delete `public/page-builder.js`, `replace_editor.py`, `replace_editor.ts`, `check_out.txt`.

## Icebox (added to `decisions/future_improvements.md`)
- Hosted section template store
- Post and page layout CSS customization
- Strict validation of nested `list` sub-fields
