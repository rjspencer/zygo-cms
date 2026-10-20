# Public Worker Guidelines

- **Static Asset Synchronization**: The public worker serves static assets directly from `public/style.css` at runtime (via `[assets]` binding in `packages/public-worker/wrangler.toml`). When modifying public site styles, keep `public/style.css` and `packages/public-worker/src/style.css` synchronized.
- **Public SSR Accessibility Baseline**: All public SSR templates must maintain universal `:focus-visible` styling (using `var(--color-accent)`), an accessible `.skip-link` pointing to `<main id="main-content">`, and descriptive `aria-label` landmarks on all `<nav>` and search forms (`role="search"`).
- **SEO & Canonical URLs**: Always resolve canonical origins using `utils::get_canonical_origin`. Strictly include trailing slash for homepage (`{origin}/`) and omit trailing slash for posts/pages (`{origin}/post/:slug`).
- **Rust Raw String Delimiters with HTML**: When defining HTML templates or markup inline in Rust code, always use `r##"..."##` (with two or more `#` characters) instead of `r#"..."#` to prevent attributes like `href="#..."` from prematurely terminating the raw string literal.
- **Theming Guidelines Skill**: For deep design tokens, color-mix rules, typography presets, and ThemeEditor conventions, refer to the on-demand workspace skill in `.agents/skills/zygo-theming/SKILL.md`.
- **Askama Templates as Single Source of Truth**: Never hardcode mock HTML strings in tests for public SSR rendering. Always load real Askama templates from `templates/` via `fs.readFileSync` and strip template tags.
- **Offline CDN Mocking**: Client scripts loaded via browser CDN imports (`https://esm.sh/...`) must be aliased in `vitest.config.js` to lightweight local stubs (`tests/mocks/esm.js`).
