# Zygo CMS Roadmap & Prioritized Backlog

This document tracks upcoming priorities, planned enhancements, and long-term architectural items for Zygo CMS.

---

## 1. Immediate Priority

### Headless CMS Content API
- **Concept**: Enable Zygo CMS to function as a decoupled, headless CMS powering external static site generators, mobile apps, or modern JAMstack frontends (Astro, Next.js, SvelteKit).
- **Feasibility & Effort**: **Low to Moderate**. Zygo is already ~70% of the way there:
  - Database entries already store both rendered `body_html` and structured TipTap JSON (`body_json`).
  - Rust models already derive `serde::Serialize` and `serde_json` is integrated.
  - Paginated D1 queries and filtering logic (category, tag, status) already exist.
  - Edge caching infrastructure works seamlessly with JSON responses.
- **Key Requirements**:
  - **Public Content Delivery API**:
    - `GET /api/v1/posts` & `GET /api/v1/pages`: Paginated listing with `?page=`, `?per_page=`, `?tag=`, and `?category=`.
    - `GET /api/v1/posts/:slug` & `GET /api/v1/pages/*`: Single entry retrieval with full metadata, breadcrumbs, `body_html`, and `body_json`.
    - `GET /api/v1/taxonomies`: List tags and categories with entry counts.
  - **CORS Support**: Provide configurable CORS headers (`Access-Control-Allow-Origin`, `OPTIONS` preflight) on `/api/*` routes for decoupled frontends.
  - **API Token Auth (Optional)**: Optional read-only API key support (`Authorization: Bearer <token>` or `X-Api-Key`) for private/draft preview consumption.
  - **Webhook Triggers**: Dispatch webhooks to trigger external frontend builds (Cloudflare Pages, Vercel, Netlify) on publish/update events.

---

## 2. Soon

### Webhooks & API Integrations
- **Goal**: Notify external systems of CMS events.
- **Details**:
  - Dispatch HTTP callbacks on key events (e.g., `entry.published`, `entry.updated`) to trigger external builds, social media posts, or notifications.

### Custom Workflow Statuses
- **Goal**: Extend editorial workflows beyond basic draft/published states.
- **Details**:
  - Add custom states such as "In Review", "Ready for Publish", or "Archived".
  - Integrate with RBAC to restrict who can transition between states.

### Bulk Content Operations
- **Goal**: Enable efficient management of large content libraries.
- **Details**:
  - Add bulk-select capabilities to lists (posts, pages).
  - Support bulk publish/unpublish, bulk tagging, and move to trash.

### Editor Module Follow-Ups (post `react-hook-form` refactor)
- **WebMCP `onExpandSection` is no longer wired**: Newly inserted sections default to expanded so behavior is the same today, but `useEditorWebMCP` no longer passes `onExpandSection`. If a collapsed section needs to be expanded by an agent, expansion state must be exposed outside `SectionList` (context or form-adjacent store).
- **WebMCP `title` setter no longer exits title edit mode**: Previously `setTitle` from a tool closed the inline editor. `TitleEditor` now owns that state; expose it if agents should close it.
- **Whole-form re-render per keystroke**: `EditorLayout` and `useEditorWebMCP` call `useWatch` on many fields (needed for the Wasm preview and tool snapshots). If typing gets sluggish, narrow subscriptions or move the WebMCP options to a ref read at tool-call time.
- **Subcomponent Storybook coverage**: `Editor.stories.tsx` and `EditorStatusView.stories.tsx` are in place; individual subcomponents under `pages/Editor/components/*` can add dedicated `.stories.tsx` files as needed.
- **WebMCP parity test**: Add a Vitest integration test that mutates the editor through the WebMCP registry (e.g. `editor_set_sections`, `editor_get_content`) against the new RHF-backed `useEditorWebMCP`.
- **Test-only nit**: `Editor.test.tsx` activates Radix tabs with `fireEvent.mouseDown`; prefer `userEvent.click` if the suite adopts `@testing-library/user-event` more broadly.

---

## 3. Icebox & Long-Term Considerations

### Content Localization & Multi-language (i18n)
- **Goal**: Treat locales as first-class citizens.
- **Details**:
  - Allow authors to manage translated versions of the same post/page.
  - Serve content via subdirectories (e.g., `/en/post-slug` vs `/fr/post-slug`).

### Multiplayer / Real-time Editing
- **Goal**: Enable Google Docs-style real-time collaborative editing.
- **Details**:
  - Leverage TipTap's native Yjs support.
  - Sync cursor positions and edits via WebSockets (Cloudflare Durable Objects).

### Hosted Section Template Store
- **Goal**: Let users browse and install section templates from a store we host.
- **Details**:
  - Built-in section templates are fully deletable; if a user deletes one and wants it back, they can re-install it from the store.
  - Also a distribution channel for new community/official section templates.

### Post & Page Layout CSS Customization
- **Goal**: Allow users to customize the CSS of the locked post and page layouts.
- **Details**:
  - Post/page layouts live in Rust (`DEFAULT_POST` / `DEFAULT_PAGE`) and are not editable in the admin; only CSS overrides would be exposed.

### Visual Field Builder: Nested List Sub-field Validation
- **Goal**: Strictly validate `list` sub-fields used inside template loops (e.g. `item.caption`).
- **Details**:
  - Currently warn-only, since MiniJinja's `undeclared_variables` cannot map loop variables back to a list's sub-fields.

### Permanent Deletion & Empty Trash UI
- **Goal**: Provide an explicit UI/API mechanism in the admin panel to empty trash or permanently delete soft-deleted entries.
- **Details**:
  - Add "Delete Permanently" action in the Trash table and an "Empty Trash" batch action.
  - Cascade delete associated snapshots in `entry_revisions`.
  - Intentionally kept in the Icebox to maximize data safety; permanent deletion currently requires direct SQL execution via Wrangler D1.

### Connect an Email Sender
- **Goal**: Automatically dispatch onboarding invitation and authentication emails to new users directly from Zygo CMS.
- **Details**:
  - Integrate an email delivery provider (e.g., Cloudflare Email Routing / Workers Email, Resend, or Mailchannels).
  - Automatically deliver the onboarding email with access instructions when an admin invites a user, eliminating the manual copy-paste workflow.

### Shareable Links Enhancements
- **Goal**: Expand the Shareable Trackable Links feature in the Admin UI.
- **Details**:
  - Add a logo overlay to the QR code generation.
  - Implement pagination for the trackable links list.
  - Add filtering, sorting, and querying capabilities to the list.
  - Add a description field to the trackable link.
  - Display the creator of the trackable link.
  - Allow editing of the title and description, while keeping the URL locked and uneditable.
