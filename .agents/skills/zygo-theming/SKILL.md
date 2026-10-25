---
name: zygo-theming
description: >-
  Guidelines and specifications for Zygo CMS public site styling, CSS design tokens,
  typography presets, color-mix adaptability, and ThemeEditor component conventions.
  Use this skill whenever reviewing, editing, or debugging public site styles or theming.
---

# Zygo CMS Theming & Styling Guidelines

## 1. CSS Custom Properties & Design Tokens
All public site components must consume CSS variables defined on `:root` with sensible fallbacks:
- `--color-bg`: Page background color (default: `#ffffff`)
- `--color-surface`: Card, input, and container background (default: `#f8f9fa`)
- `--color-text`: Primary body text (default: `#1a1a1a`)
- `--color-text-muted`: Metadata, timestamps, captions (default: `#666666`)
- `--color-border`: Borders, dividers, outlines (default: `#e5e7eb`)
- `--color-accent`: Interactive links, focus rings, primary highlights (default: `#2563eb`)
- `--font-headline`: Headline font family (default: `'Newsreader', Georgia, serif`)
- `--font-body`: Body text font family (default: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`)
- `--font-size-base`: Base root font size (default: `18px`)
- `--line-height-body`: Body line height (default: `1.7`)

## 2. Dynamic Contrast with `color-mix()`
**Strictly avoid hardcoded hex colors** (e.g., `#1a1a1a`, `#eaeaea`, `#ccc`, `#444`) in component styles. Use `color-mix()` against design tokens so elements automatically adapt across light, dark, and user-customized themes:
- Border subtleness: `color-mix(in srgb, var(--color-border) 40%, transparent)`
- Muted text & metadata: `color-mix(in srgb, var(--color-text) 65%, transparent)`
- Hover backgrounds: `color-mix(in srgb, var(--color-accent) 10%, transparent)`
- Code block backgrounds: `color-mix(in srgb, var(--color-surface) 95%, var(--color-text))`

## 3. Typography & Prose Rules
- **Monospace Code**: `.prose pre` and `code` must explicitly specify monospace fonts (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`). Never allow code elements to inherit serif headline fonts.
- **Prose Hyperlinks**: Hyperlinks in content (`.prose a`) must be clearly distinguishable:
  - Color: `var(--color-accent)`
  - Underline: `text-decoration: underline`
  - Hover: Opacity or accent shift transition
- **List Markers**: Do not allow Tailwind or CSS resets to hide bullets or numbering. Explicitly retain `list-style-type: disc` for `.prose ul` and `list-style-type: decimal` for `.prose ol`.
- **Headings**: Ensure headings (`h1`-`h4`) use `var(--font-headline)` with proper line-height and responsive clamping.

## 4. Accessibility Checklist (WCAG AA)
- **Universal Focus Rings**: All interactive elements (`a`, `button`, `input`, `summary`) must have `:focus-visible` styling using `outline: 2px solid var(--color-accent)` with `outline-offset: 2px`.
- **Skip Links**: The `.skip-link` must be positioned off-screen until focused (`:focus`), with high contrast and explicit `z-index`.
- **Form Controls**: Every search input must have an accessible label via `aria-label` or an associated `<label>`, and search forms must specify `role="search"`.
- **Navigation Landmarks**: All `<nav>` elements must include descriptive `aria-label` attributes (e.g. `aria-label="Main Navigation"`, `aria-label="Footer Navigation"`, `aria-label="Document Paging"`).

## 5. Multi-Worker & Asset Synchronization
- **Production Asset Serving**: Cloudflare Workers serves static assets for `public-worker` directly from `public/style.css` (configured via `[assets] directory = "../../public"` in `packages/public-worker/wrangler.toml`).
- **Source Sync**: `packages/public-worker/src/style.css` is the Tailwind/source counterpart. Whenever changing styles, **always keep both files synchronized**.
- Raw-string delimiter and SSR a11y rules for templates: see `packages/public-worker/AGENTS.md`.

## 6. Section Template Authoring & Conventions

### 6.1 Schema JSON Rules (`schema_json`)
Every section template defines a JSON array of fields validated by `zygo_core::template_validation::validate_template`:
- **Allowed Field Types**: `text`, `textarea`, `richtext`, `url`, `boolean`, `image`, `video`, `select`, `list`.
- **Field Constraints**:
  - `select` fields MUST define an `options: string[]` array.
  - `list` fields MUST define a `fields: Field[]` array.
  - **No Nested Lists**: Lists cannot contain nested list fields (one level only).
  - All field names used in MiniJinja template HTML must correspond to defined schema fields (or MiniJinja built-ins like `loop`, `range`).

### 6.2 MiniJinja Template Rules (`template_html`)
- **Safe HTML**: Always render `richtext` or sanitized HTML using `|safe` (e.g., `{{ body|safe }}`).
- **Responsive Images**: Local WebP images should provide responsive sources via the `media_srcset` filter:
  ```html
  <img src="{{ image|safe }}" alt="{{ title }}" loading="lazy" decoding="async" srcset="{{ image|media_srcset|safe }}" sizes="(max-width: 768px) 100vw, 50vw">
  ```
- **Video Embeds**: Video URLs must pass through the `video_embed` filter to generate privacy-respecting embed URLs (`youtube-nocookie.com` or Vimeo):
  ```html
  {% set embed_url = video_url|video_embed %}
  {% if embed_url %}<iframe src="{{ embed_url }}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>{% endif %}
  ```
- **Loops & Iteration**: Use MiniJinja built-ins (`{% for item in items %}`, `loop.index`, `loop.first`, `loop.last`).

### 6.3 Template CSS Rules (`template_css`)
- **Root Container**: Prefix container class with `.section-{template-id}` (e.g. `.section-pricing`, `.section-stats`). Always set `box-sizing: border-box; width: 100%;`.
- **Theme Variables**: Consume `:root` design tokens with fallbacks:
  - Surfaces & Cards: `background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); box-shadow: var(--box-shadow, 0 4px 6px rgba(0,0,0,0.05));`
  - Typography: `font-family: var(--font-headline, 'Newsreader', Georgia, serif);` for headings; `font-family: var(--font-body, system-ui, sans-serif);` for body.
  - Accent / Primary Action: `background: var(--color-accent, #991b1b); color: #ffffff;`
- **Dynamic Adaptability**: Use `color-mix()` for tinted backgrounds, borders, or hover highlights rather than hardcoded colors.

### 6.4 D1 Migrations & Theme Preview Integration
- **Built-in Seeding**: Seed built-in templates with `is_locked = 1` in migrations.
- **Theme Preview Entry**: Whenever adding or modifying built-in section templates, append corresponding sample data to `entries.body_json` where `slug = 'theme-preview'` and update `search_text`.
- General migration rules (explicit columns, nullable `ALTER TABLE`): see `migrations/AGENTS.md`.

## 7. Built-in Theme Presets & Dark Mode Authoring Workflow

When introducing or modifying a built-in theme preset (e.g., `Modern Editorial (Dark)` or `Bento-Brutalism (Dark)`), follow this mandatory 4-point synchronization checklist:

### 7.1 Core Tokens & Rust SSR (`packages/core` & `packages/public-worker`)
1. **Core Constructor**: Define `ThemeTokens::<preset_snake_case>()` in `packages/core/src/models/theme.rs`.
2. **Preset Lookup**: Update `ThemeTokens::get_preset(name: &str)` to match both standard name (e.g. `"Modern Editorial (Dark)"`) and common alias (e.g. `"Modern Editorial Dark"`).
3. **Core Unit Tests**: Assert token defaults and resolution via `theme_active_name` in `packages/core/src/models/theme.rs`.
4. **Public Worker SSR Verification**: In `packages/public-worker/src/views.rs`, verify edge rendering under the preset (e.g. assert that built-in templates and `views::generate_theme_root_css` render cleanly without CSS breakage).

### 7.2 Admin UI ThemeEditor (`packages/admin-ui`)
1. **Constants**: Define `<PRESET_NAME>_PRESET` and register in `BUILT_IN_THEMES` in `packages/admin-ui/src/components/ThemeEditor/constants.ts`.
2. **Re-export**: Re-export the preset from `packages/admin-ui/src/components/ThemeEditor/index.ts`.
3. **Storybook Stories**: Add both Editorial and Docs preview stories in `packages/admin-ui/src/components/ThemeEditor/ThemeEditor.stories.tsx`.
4. **UI Tests**: Add tests in `packages/admin-ui/src/components/ThemeEditor/ThemeEditor.test.tsx` verifying Theme Picker selection, live preview token update, and active theme switching via `POST /api/settings`.

### 7.3 Dual MCP Parity Gate
1. **In-Browser WebMCP**: Update `theme_select_preset` tool description and schema in `packages/admin-ui/src/lib/webmcp/themeAndMediaTools.ts`.
2. **WebMCP Unit Tests**: Add test assertions in `packages/admin-ui/src/__tests__/WebMCPThemeMedia.test.tsx`.
3. **CLI MCP Bridge**: Verify compatibility in `packages/zygo-mcp/index.mjs`.

### 7.4 Dark Theme Design Token Principles
- **Elevated Surfaces**: Dark canvas (`--color-bg`) must have enough separation from card containers (`--color-surface`) to maintain hierarchy (e.g., `#0b0f19` canvas with `#151d2f` cards, or `#141210` obsidian with `#1f1c19` warm charcoal).
- **Legibility Floors**: Body text (`--color-text`) must achieve WCAG AAA contrast against `--color-bg` and `--color-surface`.
- **Muted Contrast**: `--color-text-muted` must remain readable for bylines and metadata without washing out against dark surfaces.
- **Shadow Adaptation**: For editorial dark themes, replace light drop shadows with deeper diffuse glows (`0 4px 14px rgba(0, 0, 0, 0.45)`); for brutalist dark themes, maintain hard, unblurred offsets (`4px 6px 0 #000000`).
- **Visual Mockup Checkpoints**: When planning dark themes with users, provide rendered visual previews (SVG / Generative UI) of candidate palette combinations (canvas, surface, borders, accents) before committing token choices.
