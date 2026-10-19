# Site Branding, Favicon, Default OG Image & Footer Settings Spec

## 1. Problem Statement & Motivation

One of Zygo CMS's core goals is to be **customizable enough for most users through the admin panel, with no code required**.

Currently, [`GeneralSettingsCard.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Settings/components/GeneralSettingsCard.tsx) and [`Settings/types.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Settings/types.ts) only expose three general fields (`siteTitle`, `canonicalOrigin`, and `description`), while [`ThemeEditor`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/components/ThemeEditor/types.ts) exposes `headerTagline`. As a result, a non-developer cannot configure essential site branding without manually editing Jinja HTML in the Layout Template editors:
1. **Site Logo (`site_logo`)**: No way to display a brand logo image in the site header alongside or in place of the text title.
2. **Favicon (`site_favicon`)**: No `<link rel="icon">` is injected in the public site `<head>`.
3. **Default Social Share Image (`default_og_image`)**: When a page or post does not define a specific `cover_image` (or on the homepage/blog index), no fallback `og:image` / `twitter:image` is emitted for social link previews.
4. **Footer Copyright / Text (`footer_text`)**: The default `<footer>` only renders `footer_menu` links with no copyright notice or business tagline (e.g., `© 2026 Acme Corp. All rights reserved.`).

---

## 2. Technical Design & Implementation Plan

### 2.1 Settings Keys (`settings` D1 Table)
Because the `settings` table in D1 is already a flexible key-value store (`key TEXT PRIMARY KEY, value TEXT NOT NULL`), no `ALTER TABLE` schema change is required for the `settings` table itself. We will standardize four new keys:
- `site_logo`: URL string (e.g., `/media/1726700000000-logo.webp` or `.svg`, default `""`)
- `site_favicon`: URL string (e.g., `/media/1726700000000-favicon.webp` or `.svg`/`.png`/`.ico`, default `""`)
- `default_og_image`: URL string (e.g., `/media/1726700000000-social.webp`, default `""`)
- `footer_text`: Plain text string (e.g., `© 2026 My Site. All rights reserved.`, default `""`)

### 2.2 Admin UI Updates (`packages/admin-ui/src/pages/Settings/`)
1. **Types & Form State (`types.ts` & `useSettingsForm.ts`)**:
   - Extend `SettingsFormValues` and `SettingsApiResponse` with `siteLogo`, `siteFavicon`, `defaultOgImage`, and `footerText`.
2. **UI Controls (`GeneralSettingsCard.tsx` / `BrandingSettingsCard.tsx`)**:
   - Wrap [`Settings.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Settings/Settings.tsx) with `<MediaPickerProvider>` so users can pick existing media or upload new images directly from Settings.
   - Add accessible image picker fields (with thumbnail preview, "Choose from Media" button, and "Clear" button) for:
     - **Site Logo**
     - **Favicon**
     - **Default Social Image (`og:image`)**
   - Add a **Footer Text / Copyright** text input field (`htmlFor` + `id` + `aria-describedby`).
3. **MCP & WebMCP Parity**:
   - Expose the new branding fields in both in-browser WebMCP settings tools and `packages/zygo-mcp/index.mjs` (`zygo_get_settings` / `zygo_update_settings`).

### 2.3 Public Worker & Template Rendering (`packages/public-worker/src/views.rs` & Layout Templates)
1. **MiniJinja Context Injection**:
   - Pass `site_logo`, `site_favicon`, `default_og_image`, and `footer_text` into the MiniJinja template environment across all public views (`index`, `post`, `page`, `docs`, `search`) and the client-side Wasm preview worker (`template-wasm`).
2. **Default `<head>`, `<header>`, and `<footer>` Markup**:
   - **Favicon in `<head>`**:
     ```html
     {% if site_favicon %}
     <link rel="icon" href="{{ site_favicon|safe }}">
     {% endif %}
     ```
   - **Fallback Social Image (`og:image` & `twitter:image`)**:
     - When rendering a post or page without a `cover_image` (or on archive/index pages), fall back to `default_og_image` resolved against `canonical_origin`.
   - **Site Logo in `<header>`**:
     ```html
     <a href="/" class="site-title">
         {% if site_logo %}
         <img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">
         {% else %}
         {{ site_title }}
         {% endif %}
     </a>
     ```
   - **Footer Copyright / Text in `<footer>`**:
     ```html
     {% if footer_text %}
     <div class="footer-text">{{ footer_text }}</div>
     {% endif %}
     ```
3. **Edge Cache Invalidation**:
   - Saving settings in `POST /api/settings` purges the site's cached public routes so branding updates appear immediately at the edge.
