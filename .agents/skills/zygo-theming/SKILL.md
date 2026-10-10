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
- **Rust String Delimiters**: When modifying templates in `packages/public-worker/src/views.rs`, always use `r##"..."##` (with 2+ `#`) so attributes like `href="#main-content"` do not terminate string literals prematurely.
