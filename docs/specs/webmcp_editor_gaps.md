# WebMCP Editor Parity Gaps & Follow-Up Plan

## Overview

With `window.webmcp`, `navigator.modelContext`, the interactive Tool Runner / RPC Console in [`WebMCPAssistantDrawer.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/components/assistant/WebMCPAssistantDrawer.tsx), and full Page Section / Metadata tools in [`Editor.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Editor.tsx) (`entryTools.ts`) now implemented, **Page**, **Post**, and **Docs** editors have 100% end-to-end WebMCP parity.

This document tracks the remaining editor-specific WebMCP parity gaps across the other Admin UI editors so they can be completed in a future iteration without requiring UI fallback clicks.

---

## Current Editor Coverage Summary

| Editor | Route | WebMCP Status | Summary |
| :--- | :--- | :--- | :--- |
| **Page Editor** | `/pages/editor/:id` | **Complete** | Full section CRUD (`editor_get_section_templates`, `editor_add_section`, `editor_update_section`, `editor_remove_section`, `editor_move_section`, `editor_set_sections`), extended metadata (`cover_image`, `canonical_url`, `schema_json`, `parent_id`, `sort_order`), and `editor_save_draft` / `editor_publish`. |
| **Post Editor** | `/posts/editor/:id` | **Complete** | Shares `Editor.tsx` and `useTipTapWebMCP`. Full TipTap body tools (`editor_get_content`, `editor_insert_content`, `editor_replace_selection`, `editor_get_selection`), extended metadata, and save/publish actions. |
| **Docs Editor** | `/docs/editor/:id` | **Complete** | Shares `Editor.tsx` (`entryType === 'doc'`). Full TipTap body tools, hierarchical doc metadata (`parent_id`, `sort_order`), and save/publish actions. |
| **Template Editor** | `/templates/:id` | **Complete** | Full template buffer reading/editing (`template_get_active`, `template_update_markup`, `template_update_styles`, `template_update_schema`, `template_validate_syntax`, `template_render_preview`), metadata mutation (`template_set_metadata`), save trigger (`template_save`), and draft discard (`template_discard_draft`). |
| **Theme Editor** | `/theme` | **Complete** | Live in-memory token inspection and updating (`theme_get_active_tokens`, `theme_update_live_tokens`, `theme_reset_live_tokens`), editor save (`theme_save_active`), named custom theme creation (`theme_save_as_custom`), and preset / font pairing selection (`theme_select_preset`). |
| **Site Navigation Editor** | `/navigation` | **Complete** | Contextual in-page inspection and mutations via `useNavigationEditorWebMCP` (`navigation_get_active_state`, `navigation_set_tab`, `navigation_add_item`, `navigation_delete_item`, `navigation_set_items`, `navigation_save`) and live event synchronization (`zygo:menus-updated`). |

---

## Detailed Gaps & Proposed Tools

### 1. Template Editor (`/templates/:id` & `/templates/new`)
**Files:**
- [`packages/admin-ui/src/pages/TemplateEditor.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/TemplateEditor.tsx#L215-L228)
- [`packages/admin-ui/src/lib/webmcp/templateTools.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/lib/webmcp/templateTools.ts#L613-L638)

**Current Limitation:**
- `useTemplateEditorWebMCP` receives `formId`, `formName`, `formDescription`, and `isLocked` as read-only values, and does not receive `setFormId`, `setFormName`, `setFormDescription`, `setIsLocked`, or `handleSave`.
- When creating a new template (`/templates/new`) or renaming/saving an existing one, an agent can populate the HTML, CSS, and schema via WebMCP, but still has to fall back to UI typing/clicking to set the template Slug (`formId`), Name (`formName`), Description (`formDescription`), Lock status (`isLocked`), or to click **Save Template**.

**Tools to Add:**
1. `template_set_metadata`:
   - Inputs: `{ id?: string, name?: string, description?: string, is_locked?: boolean }`
   - Updates `formId` (when `isNew`), `formName`, `formDescription`, and `isLocked` in `TemplateEditor.tsx`.
2. `template_save`:
   - Inputs: `{ force?: boolean }`
   - Invokes `handleSave(Boolean(args.force))` in `TemplateEditor.tsx` so the agent can format (via Prettier), validate, and persist the active template buffer and clear the dirty-state blocker in a single call.
3. `template_discard_draft`:
   - Inputs: `{}`
   - Invokes `discardDraft()` to clear any `localStorage` draft buffer and restore the saved template state.

---

### 2. Theme Editor (`/theme`)
**Files:**
- [`packages/admin-ui/src/components/ThemeEditor/ThemeEditor.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/components/ThemeEditor/ThemeEditor.tsx#L53-L57)
- [`packages/admin-ui/src/lib/webmcp/themeAndMediaTools.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/lib/webmcp/themeAndMediaTools.ts#L53-L140)

**Current Limitation:**
- `useThemeEditorWebMCP` only receives `{ tokens, setTokens, onReset }`.
- If an agent mutates live tokens via `theme_update_live_tokens`, the Theme Editor marks `isDirty = true` (activating the unsaved changes navigation blocker). If the agent then calls the global `update_theme_settings` REST tool instead of the editor's `handleSave`, `isDirty` remains `true` in `ThemeEditor`.
- Additionally, there are no tools to switch between built-in/custom theme presets (`applyThemeSelection`), apply typography presets (`handleApplyFontPreset`), or save the current tokens as a named custom theme (`handleConfirmSaveAs`).

**Tools to Add:**
1. `theme_save_active`:
   - Calls `handleSave()` on the mounted `ThemeEditor` to persist live tokens and reset `isDirty`.
2. `theme_save_as_custom`:
   - Inputs: `{ name: string }`
   - Saves the current live tokens as a named custom theme in `ThemeEditor`.
3. `theme_select_preset`:
   - Inputs: `{ theme_name?: string, font_preset?: string }`
   - Switches the selected/active theme preset or applies a font preset in `ThemeEditor`.

---

### 3. Site Navigation Editor (`/navigation`)
**Files:**
- [`packages/admin-ui/src/pages/Navigation.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Navigation.tsx)
- [`packages/admin-ui/src/lib/webmcp/themeAndMediaTools.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/lib/webmcp/themeAndMediaTools.ts#L454-L558)

**Current Limitation:**
- Global tools `get_menus` and `update_menu` interact directly with `/api/menus` and `/api/menus/:name`, without invalidating the React Query `['menus']` cache or updating `localMenus` state when `/navigation` is open.
- An agent viewing `/navigation` cannot inspect or stage uncommitted changes in `localMenus` (for `header` or `footer` tabs) or see the UI table update immediately after calling `update_menu`.

**Improvements & Tools to Add:**
1. Invalidate `queryClient.invalidateQueries({ queryKey: ['menus'] })` (or notify open listeners) when global `update_menu` succeeds.
2. Add a `useNavigationEditorWebMCP` hook in `Navigation.tsx` exposing contextual tools when on `/navigation`:
   - `navigation_get_active_state`: Returns `activeTab` (`header` | `footer`), `localMenus`, and available `sitePages`.
   - `navigation_set_items`: Updates `localMenus[menu]` (`header` or `footer`) in-memory and optionally saves via `updateMenuMutation`.
   - `navigation_add_item` / `navigation_remove_item`: Appends or removes a menu item (or nested child item) by path/index.
