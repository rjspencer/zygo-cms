# Header Improvements Specification: Optional Tagline & Dark Mode Logo

## 1. Executive Summary

This specification outlines the architectural and UI implementation for two key header improvements across Zygo CMS:
1. **Optional Header Site Tagline (`class="site-tagline"`)**: Ensure the site tagline defaults to nothing (`""`) rather than injecting theme preset defaults ("An Editorial Review & Journal" / "Specs, Dispatches & Agentic Systems"). The tagline element is omitted from the DOM when empty.
2. **Dark Mode Site Logo (`site_logo_dark`)**: Allow administrators to upload an optional dark mode variant of the site logo. In public SSR rendering, modern `<picture>` markup serves the dark variant when the visitor's device is in dark mode (`(prefers-color-scheme: dark)`), cleanly falling back to the primary logo (`site_logo`) if no dark variant is configured.

---

## 2. Problem Statement & Root Cause

### 2.1 Site Tagline Persistence
- **Current Behavior**: When an administrator clears the tagline or switches themes, the public site and admin preview unexpectedly display hardcoded theme defaults ("An Editorial Review & Journal" or "Specs, Dispatches & Agentic Systems").
- **Root Cause**:
  1. Built-in presets in `packages/core/src/models/theme.rs` (`ThemeTokens::modern_editorial()` and `ThemeTokens::bento_brutalism()`) and `packages/admin-ui/src/components/ThemeEditor/constants.ts` initialize `header_tagline` / `headerTagline` with sample text.
  2. In `packages/public-worker/src/views.rs` (`inject_theme_context`), a hardcoded fallback `.unwrap_or("An Editorial Review & Journal")` guarantees a tagline is always injected even if `site_tagline` is unset.
  3. `packages/admin-ui/src/lib/webmcp/themeAndMediaTools.ts` defaults `theme_header_tagline` to `"An Editorial Review & Journal"`.

### 2.2 Site Logo in Dark Mode
- **Current Behavior**: Zygo CMS supports a single `site_logo` setting. If a site uses a dark theme or the user's OS is in dark mode, dark-colored logos have insufficient contrast against dark backgrounds.
- **Root Cause**: There is no dedicated `site_logo_dark` setting key, no UI upload control in Settings, and layout templates only emit a single `<img src="{{ site_logo }}" class="site-logo">`.

---

## 3. Technical Design

### 3.1 Data Model & Settings
No schema migrations are required for the `settings` table, as it is a flexible key-value store (`key TEXT PRIMARY KEY, value TEXT NOT NULL`).
- **New Setting Key**: `site_logo_dark` (TEXT, e.g. `/media/1726700000000-logo-dark.webp` or empty string `""`).
- **Tagline Setting Keys**:
  - `site_tagline` (in `settings` table, default `""`).
  - `theme_header_tagline` (in `ThemeTokens`, default `""`).

### 3.2 Public Worker & SSR Template Rendering
In `packages/public-worker/src/views.rs` (`inject_theme_context`):
1. **Tagline Resolution**:
   ```rust
   let site_tagline = if !tokens.header_tagline.trim().is_empty() {
       tokens.header_tagline.as_str()
   } else {
       settings
           .and_then(|s| s.get("site_tagline").map(|v| v.as_str()))
           .unwrap_or("")
   };

   if !site_tagline.trim().is_empty() {
       ctx.insert(
           "site_tagline".to_string(),
           serde_json::Value::String(site_tagline.to_string()),
       );
   }
   ```
   If empty, `site_tagline` is completely omitted from the template context, preventing `<div class="site-tagline">` from rendering.

2. **Dark Mode Logo Resolution**:
   ```rust
   let site_logo = settings
       .and_then(|s| s.get("site_logo").map(|v| v.as_str()))
       .filter(|v| !v.trim().is_empty());
   let site_logo_dark = settings
       .and_then(|s| s.get("site_logo_dark").map(|v| v.as_str()))
       .filter(|v| !v.trim().is_empty());

   if let Some(logo) = site_logo {
       ctx.insert("site_logo".to_string(), serde_json::Value::String(logo.to_string()));
   }
   if let Some(dark_logo) = site_logo_dark {
       ctx.insert("site_logo_dark".to_string(), serde_json::Value::String(dark_logo.to_string()));
   }
   ```

3. **HTML Template Standard (`packages/core/src/models/layout_defaults.rs` & `views.rs`)**:
   ```html
   <a href="/" class="site-title">
       {% if site_logo %}
           {% if site_logo_dark %}
           <picture class="site-logo-picture">
               <source srcset="{{ site_logo_dark|safe }}" media="(prefers-color-scheme: dark)">
               <img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">
           </picture>
           {% else %}
           <img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">
           {% endif %}
       {% elif site_logo_dark %}
           <img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo">
       {% else %}
           {{ site_title }}
       {% endif %}
   </a>
   {% if site_tagline %}
   <div class="site-tagline">{{ site_tagline }}</div>
   {% endif %}
   ```

4. **Public CSS Updates (`public/style.css` and `packages/public-worker/src/style.css`)**:
   ```css
   .site-logo-picture {
     display: inline-flex;
     align-items: center;
   }
   ```

5. **D1 Layout Template Upgrade Migration (`migrations/0009_dark_mode_site_logo.sql`)**:
   Safely update existing stored layout templates in D1 using `UPDATE layout_templates SET template_html = REPLACE(...)`.

---

### 3.3 Admin UI & Theme Editor Updates

#### 1. Branding Settings (`packages/admin-ui/src/pages/Settings/`)
- **Types (`types.ts`)**: Add `siteLogoDark?: string;` to `SettingsFormValues` and `SettingsApiResponse`.
- **Form Hook (`useSettingsForm.ts`)**: Initialize `siteLogoDark` from `settingsData?.site_logo_dark`, and send `site_logo_dark: values.siteLogoDark` on save.
- **BrandingSettingsCard (`BrandingSettingsCard.tsx`)**:
  - Add "Site Logo (Dark Mode)" section directly beneath Site Logo.
  - Dedicated media picker flow (`setPickerTarget('logoDark')`).
  - Clear button (`data-testid="settings-clear-logo-dark-button"`).
  - High-contrast / dark container preview (`data-testid="settings-logo-dark-preview"`) so light/white logos are immediately readable.
  - Helper text: *"Optional dark mode alternative. Displayed when visitors use dark mode. If unset, the main logo is used."*

#### 2. Theme Editor (`packages/admin-ui/src/components/ThemeEditor/`)
- **Constants (`constants.ts`)**: Set `headerTagline: ''` for `MODERN_EDITORIAL_PRESET` and `BENTO_BRUTALISM_PRESET`.
- **HeaderStylingPanel (`HeaderStylingPanel.tsx`)**: Update placeholder from hardcoded preset to `"Optional site tagline"`.
- **PreviewHeader (`PreviewHeader.tsx`)**:
  - Accept `siteLogoDark?: string`.
  - When `siteLogoDark` is present, render `<picture><source srcSet={resolvedLogoDark} media="(prefers-color-scheme: dark)" /><img src={resolvedLogo || resolvedLogoDark} alt={displayTitle} class="site-logo" ... /></picture>`.

#### 3. Dual MCP Parity Gate (`packages/admin-ui/src/lib/webmcp/` & `packages/zygo-mcp/`)
- Update `DEFAULT_THEME_TOKENS.headerTagline` and `DEFAULT_THEME_SETTINGS.theme_header_tagline` to empty strings (`''`).
- Update `get_settings` and `update_settings` descriptions to include `site_logo_dark`.
- Keep in-browser WebMCP and backend CLI MCP (`packages/zygo-mcp/index.mjs`) in strict parity.

---

## 4. Verification & Quality Gates

1. **Rust Tests (`cargo test`)**:
   - Verify `ThemeTokens::modern_editorial()` and `ThemeTokens::bento_brutalism()` return empty `header_tagline`.
   - Verify `render_index`, `render_post`, and `render_page` do not render `<div class="site-tagline">` when tagline is unset.
   - Verify `render_index` with `site_logo` and `site_logo_dark` produces the `<picture>` tag.
   - Verify `render_index` with only `site_logo` renders single `<img>` without `<picture>`.
2. **Vitest Unit & Integration Tests (`pnpm run test:all`)**:
   - `Settings.test.tsx`: Test loading, editing, choosing media, clearing, and saving `site_logo_dark`.
   - `ThemeEditor.test.tsx`: Test that tagline defaults to empty and doesn't inject preset text.
   - `WebMCPThemeMedia.test.tsx`: Test settings mutation and inspection with `site_logo_dark`.
3. **TypeScript Typecheck**:
   - `pnpm --filter admin-ui exec tsc --noEmit` must pass with zero errors.
4. **Production Build**:
   - `pnpm run build` must compile all Wasm workers and React Admin UI cleanly.
5. **UI QA 1+2+4 Protocol**:
   - Inspect Storybook story for `BrandingSettingsCard` and `ThemeEditor` with dark mode logo configured.
