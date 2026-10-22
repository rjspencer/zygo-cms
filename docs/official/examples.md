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
   Zygo includes built-in section templates (`hero`, `features`, `text-image`, `carousel`, `gallery`, `testimonial`, `faq`, `contact-form`, `newsletter`). You can also create custom section templates under **Templates** (`/templates`).

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
   - Add a `Hero` section and fill in the headline and CTA button.
   - Add a `Features` section to showcase product capabilities.
   - Add a `Contact Form` or `Newsletter` section for lead capture.
   - Reorder sections via drag-and-drop.

4. **Persistence & SSR Compilation:**
   The block configuration is stored in `body_json` as a structured array:
   ```json
   [
     {
       "template_slug": "hero",
       "data": {
         "headline": "Ship Faster with Edge Architecture",
         "subheadline": "Built on Cloudflare Workers and D1.",
         "button_text": "Get Started",
         "button_url": "/about"
       }
     },
     {
       "template_slug": "features",
       "data": {
         "items": [
           { "title": "Ultra-Fast SSR", "description": "Sub-millisecond edge response." },
           { "title": "Zero Ops", "description": "Powered entirely by serverless primitives." }
         ]
       }
     }
   ]
   ```
   At save time, the Admin API worker compiles and sanitizes the output into `body_html`, enabling instantaneous edge SSR on the Public Worker with no runtime template compilation overhead.

## Recipe 3: Customizing the Theme

In Zygo CMS, themes and templates are completely dynamic and managed at runtime without modifying or recompiling Rust binaries.

### 1. Theme Editor (`/theme`)

Site branding, typography, and styling tokens are managed directly in the Admin UI:

- **Color Tokens:** Customize primary brand colors, accent colors, neutral surfaces, text tones, and borders. Includes dark mode tokens and instant preview.
- **Typography Presets:** Select from pre-configured font pairings (such as Modern Editorial, Bento Brutalism, Clean Sans, or Monospace) or specify custom Google Fonts URLs.
- **Layout & Header Settings:** Adjust container max-widths, border radiuses, and header navigation styles (centered, split, or inline).
- **Persistence:** All theme choices are saved directly to the `settings` table as CSS design tokens. The Public Worker injects these tokens as CSS variables (`:root { --color-primary: ...; }`) into edge-rendered pages with immediate cache invalidation.

### 2. Customizing Templates in the Admin UI (`/templates`)

Templates are stored in Cloudflare D1 and can be edited live:

- **Section Templates:** Modify the Minijinja HTML and scoped CSS of any content block in `/templates`. Changes take effect across all pages using that section template once saved.
- **Layout Templates:** Edit the outer HTML frame (headers, navigation, footers, `<head>` tags) for your site.
- **Revision History:** All template modifications record automated revisions (`/templates/:id/revisions`) with one-click restore.

### 3. Developer Note: Embedded Fallbacks

Developers only need to modify Rust code (`packages/public-worker/src/views.rs`) if changing the default embedded fallback templates compiled into worker binaries for fresh installations prior to initial database seeding. All production theming is handled through the Admin UI.

## Recipe 4: Going Headless / API Usage

Zygo CMS can act as a headless backend for modern frontend frameworks such as Next.js, Astro, Remix, Nuxt, or native mobile apps.

### 1. Authenticating with Cloudflare Access Service Tokens

All endpoints under `/api/*` require authentication. For headless frontend servers, build workers, or CI/CD pipelines, authenticate using Cloudflare Access Service Tokens by including the `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers with every request:

```bash
curl -X GET "https://admin.yourdomain.com/api/entries" \
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
    "body_json": "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Welcome to our new publication built on edge infrastructure.\"}]}]}",
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
    "body_html": "<section class=\"section-hero\"><h1>About Our Team</h1></section>",
    "body_json": "[{\"template_slug\":\"hero\",\"data\":{\"headline\":\"About Our Team\",\"subheadline\":\"Building edge-first software.\"}}]",
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

Headless consumers have two flexible approaches for rendering Zygo CMS content:

- **Pre-rendered HTML Injection:** Use `body_html` to directly inject edge-compiled HTML (e.g., `set:html` in Astro, `dangerouslySetInnerHTML` in React). This preserves Zygo's theme styling and responsive picture markup without maintaining separate frontend template components.
- **Structured JSON AST Rendering:** Parse `body_json` to map ProseMirror AST nodes (for Posts and Docs) or Section Template slugs (for Pages) to native React, Vue, or Svelte design system components for custom layout control.
