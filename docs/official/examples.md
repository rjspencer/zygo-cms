# Common Examples & Recipes

Learn how to implement common use cases and patterns using Zygo CMS.

## Recipe 1: Building a Personal Blog

Zygo CMS is optimized for blogging and publication sites out of the box.

1. **Setup Categories & Tags:** In the Admin UI, assign categories (e.g., "Engineering", "Design") and comma-separated tags to organize your articles.
2. **Write a Post:** Create a new Entry of type `post`. Use the rich-text editor (powered by TipTap) to draft content, embed media from the Media Library, and configure SEO summaries.
3. **Set Publishing Details:** In the sidebar, select your category, specify tags, upload a cover image, and set the publication date.
4. **Publish & Distribute:** Once published, the post is automatically edge-rendered at `/post/:slug`, indexed in `/posts`, and syndicated to `/rss.xml`, `/feed.xml`, and `/sitemap.xml`.

## Recipe 2: Building a Landing Page

Landing pages require structured, multi-column layouts rather than continuous rich text. Zygo CMS achieves this using its modular **Section Templates** block architecture.

1. **Select or Create Section Templates:**
   Zygo includes **17 built-in preset section templates** out of the box:
   `hero`, `text`, `text-image`, `gallery`, `image-carousel`, `call-to-action`, `feature-grid`, `testimonial`, `faq`, `video-embed`, `pricing`, `stats`, `logo-cloud`, `team`, `steps`, `contact-form`, and `newsletter`. You can also create custom section templates under **Templates** (`/templates`).

   A Section Template defines a schema (`schema_json`) specifying editable fields:
   ```json
   [
     { "name": "headline", "type": "text", "label": "Headline", "required": true },
     { "name": "subheadline", "type": "textarea", "label": "Subheadline", "required": false },
     { "name": "button_text", "type": "text", "label": "Button Text", "required": false },
     { "name": "button_url", "type": "url", "label": "Button URL", "required": false },
     { "name": "image", "type": "image", "label": "Background Image", "required": false }
   ]
   ```

   And pairs it with a Minijinja HTML template (`template_html`):
   ```html
   <section class="section-hero">
     <div class="hero-content">
       <h1 class="hero-headline">{{ headline }}</h1>
       {% if subheadline %}<p class="hero-subheadline">{{ subheadline }}</p>{% endif %}
       {% if button_text and button_url %}
       <a href="{{ button_url|safe }}" class="hero-btn">{{ button_text }}</a>
       {% endif %}
     </div>
   </section>
   ```

2. **Create the Page Entry:**
   Create a new Entry of type `page` with the slug set to `/` (for the homepage) or `/landing`.

3. **Stack Section Blocks:**
   In the Page Editor, stack sections using the block builder:
   - Add a `Hero` section (`hero`) and fill in the headline and CTA button.
   - Add a `Feature Grid` section (`feature-grid`) to showcase product capabilities.
   - Add a `Contact Form` (`contact-form`) or `Newsletter` (`newsletter`) section for lead capture.
   - Reorder sections via drag-and-drop.

4. **Persistence & SSR Compilation:**
   The block configuration is stored in `body_json` as a structured array:
   ```json
   [
     {
       "type_id": "hero",
       "data": {
         "headline": "Ship Faster with Edge Architecture",
         "subheadline": "Built on Cloudflare Workers and D1.",
         "button_text": "Get Started",
         "button_url": "/about"
       }
     },
     {
       "type_id": "feature-grid",
       "data": {
         "title": "Core Capabilities",
         "features": [
           { "title": "Ultra-Fast SSR", "description": "Sub-millisecond edge response." },
           { "title": "Zero Ops", "description": "Powered entirely by serverless primitives." }
         ]
       }
     }
   ]
   ```
   For pages, `body_json` stores the section array while `body_html` is stored as `""` (empty string) in D1. The Public Worker dynamically renders the sections via MiniJinja at SSR time (caching the resulting HTML at the Cloudflare Edge), so template updates made in `/templates` apply immediately across all pages without requiring entries to be re-saved.

## Recipe 3: Customizing the Theme & Site Branding

In Zygo CMS, themes, site branding, and templates are completely dynamic and managed at runtime without modifying or recompiling Rust binaries.

### 1. Site Branding & Social Settings (`/settings`)

Site-wide branding, social media metadata, and identity tokens are configured under **Settings** (`/settings`):

- **Site Logo (`site_logo`):** URL of the primary light-mode logo (stored in Cloudflare R2).
- **Dark Mode Logo (`site_logo_dark`):** URL of the dark-mode brand logo. When configured, the Public SSR Worker renders an automated `<picture>` element with `<source media="(prefers-color-scheme: dark)" srcset="...">` so the logo switches seamlessly based on the visitor's system theme.
- **Favicon (`site_favicon`):** URL of the site favicon used for browser tabs and bookmarks.
- **Default Open Graph Image (`default_og_image`):** Global fallback social sharing preview image for Twitter/X, LinkedIn, and messaging apps. When viewing individual posts or pages, any per-entry `cover_image` automatically takes precedence over this default.
- **Site Tagline:** Optional header tagline rendered adjacent to the site title or logo. When left blank, it is cleanly omitted from SSR HTML.
- **Footer Text (`footer_text`):** Markdown-compatible copyright or attribution text rendered across the global layout footer.

### 2. Themes & Dual-Mode Styling (`/theme`)

Styling tokens, theme presets, and dual-mode pairing are managed under **Theme** (`/theme`):

- **Themes List (`/theme`):** Browse built-in presets (`Modern Editorial`, `Bento-Brutalism`, `Bento-Brutalism (Dark)`) and custom themes. View color swatches and active status badges at a glance.
- **Dual-Mode Pairing:** Assign an active **Primary Theme** and an optional **Dark Mode Variant**. When paired, visitors can toggle between Auto, Light, and Dark mode in the public header, with zero FOUC and strict logo synchronization.
- **Dedicated Theme Editor (`/theme/editor/:id`):** Customize typography, colors, borders, and header layout with a live split-screen preview. Built-in presets are protected as read-only with a one-click `[Duplicate to Edit]` workflow.
- **Persistence & Edge Invalidation:** Themes are stored in the D1 `themes` table. Edits immediately recompute `styles_hash` and purge Cloudflare edge caches. See [Themes & Dual-Mode Styling](themes.md) for full details.

### 3. Customizing Templates in the Admin UI (`/templates`)

Templates are stored in Cloudflare D1 and can be edited live:

- **Section Templates:** Modify the Minijinja HTML and scoped CSS of any content block in `/templates`. Changes take effect across all pages using that section template once saved.
- **Theme Preview Integration:** The `/templates` page includes an inline **Preview** link to `/theme-preview`, which showcases all 17 built-in section templates rendered live under the active theme styling and font pairings.
- **Layout Templates:** Edit the outer HTML frame (headers, navigation, footers, `<head>` tags) for your site.
- **Revision History:** All template modifications record automated revisions (`/templates/:id/revisions`) with one-click restore.

### 4. Developer Note: Embedded Fallbacks

Developers only need to modify Rust code (`packages/public-worker/src/views.rs`) if changing the default embedded fallback templates compiled into worker binaries for fresh installations prior to initial database seeding. All production theming is handled through the Admin UI.

## Recipe 4: Going Headless / API Usage

Zygo CMS can act as a headless backend for modern frontend frameworks such as Next.js, Astro, Remix, Nuxt, or native mobile apps.

### 1. Authenticating with Cloudflare Access Service Tokens

All endpoints under `/api/*` require authentication. For headless frontend servers, build workers, or CI/CD pipelines, authenticate using Cloudflare Access Service Tokens by including the `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers with every request:

```bash
curl -X GET "https://api.yourdomain.com/api/entries" \
  -H "CF-Access-Client-Id: your-service-token-client-id.access" \
  -H "CF-Access-Client-Secret: your-service-token-client-secret-value" \
  -H "Accept: application/json"
```

### 2. Entry JSON Representation

A `GET /api/entries` request returns an array of entries matching the unified schema:

```json
[
  {
    "id": 1,
    "slug": "welcome-to-zygo",
    "title": "Welcome to Zygo CMS",
    "type": "post",
    "status": "published",
    "description": "An introduction to Zygo CMS on Cloudflare Workers and D1.",
    "cover_image": "https://example.com/media/welcome-banner.webp",
    "canonical_url": "https://example.com/post/welcome-to-zygo",
    "schema_json": null,
    "category": "announcements",
    "tags": "release,cloudflare,workers",
    "published_at": "2026-10-15 10:00:00",
    "body_html": "<p>Welcome to our new publication built on edge infrastructure.</p>",
    "body_json": "{}",
    "custom_fields_json": null,
    "parent_id": null,
    "path": "/post/welcome-to-zygo",
    "sort_order": 0,
    "author_id": 1,
    "search_text": "Welcome to Zygo CMS An introduction to Zygo CMS on Cloudflare Workers and D1.",
    "created_at": "2026-10-15 09:30:00",
    "updated_at": "2026-10-15 10:00:00",
    "deleted_at": null
  },
  {
    "id": 2,
    "slug": "about",
    "title": "About Us",
    "type": "page",
    "status": "published",
    "description": "Learn more about our company.",
    "cover_image": null,
    "canonical_url": "https://example.com/about",
    "schema_json": null,
    "category": null,
    "tags": null,
    "published_at": "2026-10-15 10:00:00",
    "body_html": "",
    "body_json": "[{\"type_id\":\"hero\",\"data\":{\"headline\":\"About Our Team\",\"subheadline\":\"Building edge-first software.\"}}]",
    "custom_fields_json": null,
    "parent_id": null,
    "path": "/about",
    "sort_order": 0,
    "author_id": 1,
    "search_text": "About Us About Our Team Building edge-first software.",
    "created_at": "2026-10-15 09:30:00",
    "updated_at": "2026-10-15 10:00:00",
    "deleted_at": null
  }
]
```

### 3. Headless Frontend Rendering Strategies

Headless consumers have two flexible approaches for rendering Zygo CMS content depending on the entry type:

- **Rendered HTML Injection (`body_html`):** Used for **Posts** and **Docs**. Directly inject edge-compiled HTML (`body_html`) via `dangerouslySetInnerHTML` in React or `set:html` in Astro. This preserves Zygo's theme styling and responsive picture markup without maintaining separate frontend template components.
- **Structured Section Blocks (`body_json`):** Used for **Pages**. Parse `body_json` into structured section blocks (`type_id` and `data`, e.g., `hero`, `feature-grid`, `testimonial`, `pricing`) to map directly to your native React, Vue, or Svelte design system components for custom layout control.

## Recipe 5: Automating Content & Site Management with AI Agents (WebMCP & `zygo-mcp`)

Zygo CMS provides native integration for AI agents, enabling autonomous coding, authoring, and site administration workflows through two interfaces:

### 1. In-Browser WebMCP (`window.webmcp` & `navigator.modelContext`)

Available directly within the Admin UI for real-time agent collaboration:
- **Global Standard Bridges:** Automatically registers tools on both `window.webmcp` and the W3C standard `navigator.modelContext`.
- **Assistant Drawer & Batch RPC Console:** Human operators and in-browser agents can open the built-in Assistant Drawer or Batch RPC Console to run multi-step actions, inspect tool schemas, and execute batch updates.
- **Live Editor State Synchronization:** Tool calls directly update active React state (React Hook Form metadata, TipTap rich text, and page section arrangements via `EditorUIStateContext`), triggering live preview re-renders and auto-saving drafts without requiring DOM clicking.

### 2. Standalone CLI MCP Server (`packages/zygo-mcp/index.mjs`)

For external AI developer environments (such as Antigravity, Claude Desktop, Cursor, or Cline), Zygo CMS provides a standalone Model Context Protocol stdio server.

The server exposes **37 tools** covering all CMS operations:
- **Entries & Content:** `zygo_list_entries`, `zygo_get_entry`, `zygo_create_entry`, `zygo_update_entry`, `zygo_delete_entry`, `zygo_restore_entry`, `zygo_bulk_entries`.
- **Templates & Layouts:** `zygo_list_section_templates`, `zygo_get_section_template`, `zygo_upsert_section_template`, `zygo_delete_section_template`, `zygo_list_layout_templates`, `zygo_get_layout_template`, `zygo_update_layout_template`.
- **Navigation:** `zygo_get_menu`, `zygo_update_menu`.
- **Media & Theming:** `zygo_list_media`, `zygo_delete_media`, `zygo_get_theme_settings`, `zygo_update_theme_settings`, `zygo_reset_theme_to_defaults`.
- **Settings, Cache & SEO:** `zygo_get_settings`, `zygo_update_settings`, `zygo_get_ai_crawl_settings`, `zygo_update_ai_crawl_settings`, `zygo_clear_cache`.
- **Redirects & Forms:** `zygo_list_redirects`, `zygo_create_redirect`, `zygo_update_redirect`, `zygo_delete_redirect`, `zygo_list_form_submissions`, `zygo_get_form_submission`, `zygo_update_form_submission_status`, `zygo_delete_form_submission`.

#### MCP Client Configuration

Add the server to your MCP client configuration (e.g., `claude_desktop_config.json` or Antigravity MCP settings):

```json
{
  "mcpServers": {
    "zygo": {
      "command": "node",
      "args": ["/path/to/zygo-cms/packages/zygo-mcp/index.mjs"],
      "env": {
        "ZYGO_API_URL": "https://api.yourdomain.com",
        "CF_ACCESS_CLIENT_ID": "your-service-token-client-id.access",
        "CF_ACCESS_CLIENT_SECRET": "your-service-token-client-secret-value"
      }
    }
  }
}
```
