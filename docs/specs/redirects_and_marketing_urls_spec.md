# Custom 301/302 Redirects & Marketing URLs Manager Spec

## 1. Problem Statement & Motivation

Custom URL redirects serve two high-value needs for individuals and small businesses:
1. **SEO Migration Safety**: Businesses migrating from WordPress, Squarespace, Wix, or legacy sites need to redirect old paths (e.g., `/about-us.html` or `/blog/2024/my-post`) to their new Zygo CMS paths (`/about`, `/post/my-post`) without breaking inbound links or losing search engine rankings.
2. **Vanity Marketing URLs & Print QR Codes**: Small businesses frequently print flyers, business cards, menus, or event banners pointing to short vanity paths (e.g., `https://example.com/spring-sale` or `https://example.com/menu`) that redirect (`302` or `301`) to a deeper page, external booking link, or UTM-tagged campaign URL—and need a 1-click **QR Code popup** for any redirect URL.

---

## 2. Architecture & Design

### 2.1 D1 Database Schema (`redirects`)
Create a migration adding the `redirects` table:
```sql
CREATE TABLE IF NOT EXISTS redirects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_path TEXT NOT NULL UNIQUE,      -- Normalized path starting with '/', e.g. '/spring-sale'
    target_url TEXT NOT NULL,              -- Internal path ('/pricing') or external URL ('https://...')
    status_code INTEGER NOT NULL DEFAULT 301, -- 301 (Permanent) or 302 (Temporary)
    notes TEXT,                            -- Optional campaign/migration description
    hit_count INTEGER NOT NULL DEFAULT 0,  -- Optional lightweight redirect counter
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_redirects_source_path ON redirects(source_path);
```
*(All queries in `zygo-core` must list explicit column names—no `SELECT *`—and structs must derive `#[serde(default)]` and `#[serde(skip_unknown_fields)]`.)*

### 2.2 Public Worker Resolution (`packages/public-worker`)
- **Resolution Order**:
  - In [`packages/public-worker/src/handlers/public.rs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/public-worker/src/handlers/public.rs), check if a matching published Page or Post exists first (or check `redirects` before returning `404 Not Found` on `page_reader` / `post_reader`, or evaluate `redirects` first when `source_path` is registered).
  - Evaluating `redirects` before falling back to `404` (or checking `redirects` on unmatched routes) guarantees zero extra D1 queries on cached existing pages while allowing any custom vanity slug or legacy `.html` URL to redirect at the edge.
  - Even better: when a redirect is created or updated for `source_path`, `admin-api-worker` calls `cache::purge_urls` for `source_path`, and `public-worker` caches `301` redirect responses at the edge (`Cache-Control: public, s-maxage=86400`).
- **Validation Rules**:
  - `source_path` must start with `/`, cannot be `/` (root homepage), and cannot point to reserved system prefixes (`/api/*`, `/media/*`, `/preview/*`, `/search`, `/sitemap.xml`, `/rss.xml`, `/feed.xml`).
  - Prevent self-redirect loops (`source_path == target_url`).

### 2.3 Admin UI Placement & QR Code Integration (`packages/admin-ui`)
1. **Top-Level Sidebar Item under `Content`**:
   - In [`packages/admin-ui/src/components/Layout/Layout.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/components/Layout/Layout.tsx#L45-L53), add **Redirects** (`to: '/redirects'`) as a top-level item inside the **`Content`** navigation group alongside `Pages`, `Posts`, `Media Library`, and `Site Navigation`.
2. **Modular Page Structure (`packages/admin-ui/src/pages/Redirects/`)**:
   - Follow the modular folder convention (`Redirects.tsx`, `Redirects.test.tsx`, `Redirects.stories.tsx`, `types.ts`, `index.ts`, `components/`, `hooks/`).
   - **Create / Edit Redirect Form**:
     - `Source Path` input (auto-prefixes `/`, e.g., `/promo-2026`).
     - `Target Destination`: Type-ahead page/post selector (reusing the pattern from `Navigation`'s `PageSelectCombobox`) OR custom internal/external URL input (with UTM parameter support).
     - `Redirect Type`: `301 Permanent (SEO / Migration)` vs. `302 Temporary (Marketing / Promo)`.
     - `Notes / Campaign Label` (optional).
3. **QR Code Popup on Every Row**:
   - Reuse the existing [`QRCodeDialog`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/components/QRCodeDialog/QRCodeDialog.tsx) component (`<QRCodeDialog url={fullSourceUrl} trigger={...} />`) on every redirect row in the table!
   - Clicking the **QR Code** button opens the dialog showing the scannable QR code for `https://<canonical-domain><source_path>`, with **Copy Image** and **Download PNG** actions—just like regular page URLs and trackable links.

### 2.4 Dual MCP & WebMCP Parity
- Expose `list_redirects`, `create_redirect`, `update_redirect`, and `delete_redirect` in both:
  - In-browser WebMCP (`packages/admin-ui/src/lib/webmcp/`)
  - Backend CLI MCP (`packages/zygo-mcp/index.mjs`)
