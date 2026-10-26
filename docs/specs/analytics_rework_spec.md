# Cloudflare Dual Analytics Rework Spec (RUM + Edge HTTP)

## 1. Problem Statement & Motivation

Zygo CMS currently has an `Analytics` dashboard in the Admin UI and an `analytics_enabled` toggle in Site Settings. However, the existing implementation fails in production and does not collect or display analytics due to four core issues:

1. **GraphQL Schema Mismatch**: [`packages/admin-api-worker/src/handlers/api.rs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-api-worker/src/handlers/api.rs) queries `rumPageloadEventsAdaptiveGroups` under `zones` with dimension `clientCountryName`. In Cloudflare's API, RUM is an **account-level** dataset (`accounts`), its dimension is `countryName`, and it requires a Web Analytics `siteTag`.
2. **Missing Mandatory Time Filter**: Cloudflare GraphQL requires a time boundary (such as `datetime_geq`) on adaptive groups. The current query omits this, causing Cloudflare's API to reject the request with a GraphQL validation error.
3. **Silent Error Swallowing**: Cloudflare returns GraphQL errors with HTTP 200 and an `errors: [...]` array. The API worker blindly passes this to the client as HTTP 200, leading [`useAnalyticsData.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Analytics/hooks/useAnalyticsData.ts) to read `undefined` and display `0` views and `N/A` without alerting the user.
4. **No Public Tracking Beacon**: Public site templates in [`packages/public-worker/src/views.rs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/public-worker/src/views.rs) do not render the Cloudflare Web Analytics beacon script (`beacon.min.js`).

Furthermore, users want **GDPR-compliant, cookie-free visitor insights** alongside **operational edge request metrics**, without having to run CLI commands to update public tokens.

---

## 2. Technical Architecture & Design

### 2.1 Dual Analytics Model

The reworked system will support two complementary analytics layers:
1. **Real User Monitoring (RUM / Cloudflare Web Analytics)**:
   - Tracks actual human pageviews, top read articles, and countries.
   - 100% cookie-free, privacy-preserving, and GDPR-compliant (no consent banner required).
   - Powered by Cloudflare's lightweight `beacon.min.js` snippet.
2. **Edge HTTP Analytics (`httpRequestsAdaptiveGroups`)**:
   - Tracks total edge requests, bandwidth/bytes served, and top requested URLs.
   - Operates server-side at the CDN edge—cannot be blocked by client ad-blockers.
   - Provides graceful fallback if RUM is unconfigured or blocked by client extensions.

---

## 3. Implementation Plan & Detailed Changes

### Phase 1: Database & Site Settings (`packages/admin-ui` & `migrations`)

1. **New Setting Key**:
   - Add `analytics_site_tag` (string, default `""`) to the `settings` table.
   - Create migration `migrations/0008_analytics_site_tag.sql`:
     ```sql
     INSERT OR IGNORE INTO settings (key, value) VALUES ('analytics_site_tag', '');
     ```
2. **Admin UI Types & Form State**:
   - Update [`packages/admin-ui/src/pages/Settings/types.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Settings/types.ts):
     - `SettingsFormValues`: Add `analyticsSiteTag: string;`
     - `SettingsApiResponse`: Add `analytics_site_tag?: string;`
   - Update [`packages/admin-ui/src/pages/Settings/hooks/useSettingsForm.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Settings/hooks/useSettingsForm.ts):
     - Bind `analyticsSiteTag` from/to `analytics_site_tag`.
3. **Settings UI (`AnalyticsSettingsCard.tsx`)**:
   - Add a text input for **Cloudflare Web Analytics Site Tag / Token** (`htmlFor="settings-analytics-site-tag"` with `aria-describedby="settings-analytics-site-tag-desc"`).
   - Add helper text explaining that this token is obtained from the Cloudflare Dashboard (**Analytics & Logs → Web Analytics**).
4. **MCP & WebMCP Parity**:
   - Update `packages/admin-ui/src/lib/webmcp/tools/settings.ts` and `packages/zygo-mcp/index.mjs` to expose `analytics_site_tag` in `zygo_get_settings` and `zygo_update_settings`.

---

### Phase 2: Public SSR Beacon Injection (`packages/public-worker`)

1. **Handler Settings Loading** ([`packages/public-worker/src/handlers/public.rs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/public-worker/src/handlers/public.rs)):
   - Query `analytics_enabled` and `analytics_site_tag` from `settings` in D1 (cached).
   - When `analytics_enabled == "true"` and `analytics_site_tag` is non-empty, pass `analytics_site_tag` to the MiniJinja template context.
2. **Template Injection** ([`packages/public-worker/src/views.rs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/public-worker/src/views.rs)):
   - In all public HTML templates (`DEFAULT_INDEX`, `DEFAULT_POST`, `DEFAULT_PAGE`, `DEFAULT_DOC`, `DEFAULT_SEARCH`), add before `</head>`:
     ```html
     {% if analytics_site_tag %}
     <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "{{ analytics_site_tag }}"}'></script>
     {% endif %}
     ```
3. **Template WASM Preview** ([`packages/template-wasm/src/lib.rs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/template-wasm/src/lib.rs)):
   - Ensure the preview environment supplies an empty `analytics_site_tag` so live previews do not trigger tracking beacons.

---

### Phase 3: API Worker Analytics Handler (`packages/admin-api-worker`)

1. **Configuration & Secrets**:
   - `admin-api-worker` expects:
     - Worker Secrets: `CF_API_TOKEN` (required), `CF_ZONE_ID` (for edge analytics), `CF_ACCOUNT_ID` (for RUM analytics).
     - Database Settings: `analytics_enabled` and `analytics_site_tag`.
2. **GraphQL Query Reconstruction** ([`packages/admin-api-worker/src/handlers/api.rs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-api-worker/src/handlers/api.rs)):
   - Compute ISO-8601 timestamps for past 7 days (`datetime_geq`) and now (`datetime_lt`).
   - Construct valid queries:
     - **Zone Edge Traffic**:
       ```graphql
       viewer {
         zones(filter: { zoneTag: $zoneId }) {
           httpRequestsAdaptiveGroups(
             limit: 10,
             filter: { datetime_geq: $startTime, datetime_lt: $endTime },
             orderBy: [count_DESC]
           ) {
             count
             sum { edgeResponseBytes }
             dimensions { clientRequestPath clientCountryName }
           }
         }
       }
       ```
     - **RUM Pageload Events** (when `CF_ACCOUNT_ID` and `analytics_site_tag` are present):
       ```graphql
       viewer {
         accounts(filter: { accountTag: $accountId }) {
           rumPageloadEventsAdaptiveGroups(
             limit: 10,
             filter: { siteTag: $siteTag, datetime_geq: $startTime, datetime_lt: $endTime, bot: 0 },
             orderBy: [count_DESC]
           ) {
             count
             dimensions { requestPath countryName }
           }
         }
       }
       ```
3. **Robust Error Handling**:
   - Parse the Cloudflare GraphQL response.
   - If Cloudflare returns `{ "errors": [...] }`, extract the error messages and return HTTP 502 with a descriptive error response rather than returning success.
   - Provide a clean JSON response aggregating `rum` metrics and `edge` metrics.

---

### Phase 4: Admin UI Analytics Dashboard (`packages/admin-ui/src/pages/Analytics`)

1. **Data Hook & Types** ([`types.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Analytics/types.ts) & [`useAnalyticsData.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Analytics/hooks/useAnalyticsData.ts)):
   - Update types to represent both RUM data and Edge HTTP data.
   - Enhance state handling:
     - `isAnalyticsDisabled`: Setting is disabled (render setup card).
     - `isMissingCredentials`: Secrets or site tag not configured (render configuration guide).
     - `isError`: Real network/API error (render error banner with details).
2. **Dashboard UI Components**:
   - **Tabbed / Dual View**:
     - **Visitor Traffic (RUM)**: Total real pageviews, top read pages, top countries.
     - **Edge Infrastructure**: Total requests, bytes transferred, cache distribution.
   - If RUM is not configured yet, display a banner prompting to add the Site Tag in Settings while still rendering the Edge HTTP metrics.

---

## 4. Verification & Testing Checklist

- [ ] **Unit Tests**:
  - `cargo test` in `packages/admin-api-worker` and `packages/public-worker`.
  - Vitest in `packages/admin-ui`: update `Analytics.test.tsx`, `Settings.test.tsx`, and Storybook stories.
  - WebMCP / CLI MCP parity tests in `packages/admin-ui/src/lib/webmcp/` and `packages/zygo-mcp/`.
- [ ] **Typecheck & Build**:
  - `pnpm --filter admin-ui exec tsc --noEmit`
  - `pnpm run test:all`
  - `pnpm run build`
- [ ] **Integration Verification**:
  - Verify public site HTML output contains `<script defer ... beacon.min.js>` when enabled.
  - Verify public site HTML output omits beacon when disabled.
  - Verify Admin UI handles:
    1. Disabled state (403)
    2. Missing secrets state
    3. Live data with both RUM and Edge metrics.
