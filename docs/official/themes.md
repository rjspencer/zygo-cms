# Themes & Dual-Mode Styling

Zygo CMS features a database-backed, zero-downtime theming architecture. Themes define design tokens (typography, color palettes, spacing, borders, shadows, and header layouts) that are compiled dynamically into CSS custom properties by the Public SSR Worker.

---

## 1. Themes Overview

Themes in Zygo CMS are stored in the `themes` table in Cloudflare D1. Every theme defines:
- **Typography**: Google Fonts URL, headline font stack, body font stack, base font size, and line height.
- **Colors**: Canvas background (`--color-bg`), surface container (`--color-surface`), text (`--color-text`), muted text (`--color-text-muted`), accent (`--color-accent`), and border (`--color-border`).
- **Header Layout**: Centered, split, minimal, border style, padding, and tagline.
- **Geometry**: Border radius and box shadow.

### Built-in Presets

Zygo CMS ships with 3 locked built-in presets:
1. **Modern Editorial** (`modern-editorial`): Warm cream background, Georgia/Newsreader serifs, deep red accent (`#991b1b`), and double border header.
2. **Bento-Brutalism** (`bento-brutalism`): Stark brutalist aesthetic, Space Grotesk headline, IBM Plex Mono accents, sharp `#0f172a` borders, and high-contrast cards.
3. **Bento-Brutalism (Dark)** (`bento-brutalism-dark`): Obsidian dark canvas (`#0b0f19`), elevated dark navy surfaces (`#151d2f`), luminous cyan accents (`#38bdf8`), and deep borders.

Built-in presets cannot be overwritten or deleted directly. To customize a built-in preset, click **Duplicate** to create an editable custom copy.

---

## 2. Dual-Mode Theming (Primary + Dark Mode Variant)

Zygo CMS supports pairing a **Primary Theme** with an optional **Dark Mode Variant**:

```
Active Primary Theme: Modern Editorial (Light)
Active Dark Variant: Bento-Brutalism (Dark) [Optional]
```

### How Dual-Mode Works

1. **Single Theme Mode (Dark Variant Unset)**:
   - The Public Worker renders the primary theme tokens across all viewports.
   - The visitor theme switcher is hidden.
   - The light logo (`.site-logo-light`) is always displayed.
2. **Dual Theme Mode (Primary + Dark Variant Active)**:
   - **SSR CSS Variables**: The worker generates base `:root` tokens for the primary theme, and overrides them with the dark theme tokens under `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`.
   - **Zero-FOUC Script**: An inline script in `<head>` immediately restores the visitor's stored preference from `localStorage.getItem('zygo_theme')` before the page renders, preventing flashes of unstyled or mismatched light/dark content.
   - **Visitor Theme Switcher**: An accessible 3-way toggle button group (`Auto`, `Light`, `Dark`) appears in the site header.
   - **Strict Logo Synchronization**: Both light and dark logos are rendered in HTML, and CSS displays only the matching logo for the active theme state.

---

## 3. Managing Themes in Admin UI

Navigate to **Theme** (`/theme`) in the admin navigation.

### The Themes List (`/theme`)
- **Active Themes Section**: View currently assigned Primary and Dark Mode Variant themes. Click **[Remove]** on the Dark Mode Variant to lock the site strictly to the primary theme.
- **Create Theme**: Click **[Create Theme]** to scaffold a custom theme based on any built-in preset.
- **Action Buttons**:
  - **Activate**: Assign as Primary Theme or Dark Mode Variant.
  - **Edit**: Open the dedicated token editor (`/theme/editor/:id`).
  - **Duplicate**: Create a copy (`<name> copy`).
  - **Rename**: Change the human-readable display name.
  - **Delete**: Remove custom themes (locked presets and active themes cannot be deleted).

### The Dedicated Theme Editor (`/theme/editor/:id`)
- Modify typography, colors, and layout tokens with immediate visual feedback in the live preview pane.
- Built-in presets display a read-only badge with a one-click **[Duplicate to Edit]** button.
- Unsaved changes are protected by an interactive navigation blocker dialog.

---

## 4. Automation via MCP Tools

Both in-browser WebMCP and the CLI MCP bridge (`zygo-mcp`) provide full tool coverage for AI agents:

| Action | WebMCP Tool | CLI MCP Tool (`zygo-mcp`) |
| :--- | :--- | :--- |
| List themes & active roles | `theme_list` | `zygo_list_themes` |
| Get theme details & tokens | `theme_get` | `zygo_get_theme` |
| Create a custom theme | `theme_create` | `zygo_create_theme` |
| Activate primary or dark | `theme_activate` | `zygo_activate_theme` |
| Duplicate a theme | `theme_duplicate` | `zygo_duplicate_theme` |
| Rename a custom theme | `theme_rename` | `zygo_rename_theme` |
| Delete a custom theme | `theme_delete` | `zygo_delete_theme` |
