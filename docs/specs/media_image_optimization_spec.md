# Client-Side Image Resizing, R2 Multi-Tier Storage & Responsive `<img>` Spec

## 1. Problem Statement & Motivation

Zygo CMS guarantees **blazing-fast load times out-of-the-box, anywhere in the world**. While the Rust WebAssembly workers and Cloudflare Edge Cache deliver HTML in under 20ms, real-world Largest Contentful Paint (LCP) and page weight are vulnerable to **unoptimized user-uploaded images**:
1. **Raw Camera/Phone Uploads**: Currently, [`useMediaUpload.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Media/hooks/useMediaUpload.ts) and [`media.rs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-api-worker/src/media.rs) upload raw files up to 25 MB directly into R2 and serve those exact bytes to visitors. A single 10 MB 4000×3000 photo in a page section or gallery severely degrades mobile load times and Admin UI Media Library browsing.
2. **Missing Responsive `srcset` & Lazy Loading**: Built-in section templates in [`migrations/0001_initial_schema.sql`](file:///Users/ryan/Code/zygodactyl/zygo-cms/migrations/0001_initial_schema.sql) and [`migrations/0004_layout_templates.sql`](file:///Users/ryan/Code/zygodactyl/zygo-cms/migrations/0004_layout_templates.sql) output plain `<img src="...">` elements without `srcset`, `sizes`, `loading="lazy"`, `decoding="async"`, or `fetchpriority="high"` on Hero LCP images.

To keep Zygo CMS 100% compatible with Cloudflare's free tier (requiring zero paid Cloudflare Images add-ons) and avoid heavy image-encoding libraries in the Rust Wasm binary, we will resize and encode images into **3 WebP tiers in the browser during upload**, store them with deterministic R2 suffixes, and serve them via `?size=thumb|md` with responsive `srcset` and lazy-loading attributes.

---

## 2. Chosen Architecture

### 2.1 Three-Tier Browser WebP Pipeline (On Upload)
When a user selects a raster image (`image/jpeg`, `image/png`, `image/webp`, `image/avif`) in the Media Library or Media Picker modal, the browser uses `createImageBitmap` and `<canvas>` (`toBlob('image/webp', quality)`) to generate up to three tiers before uploading:

| Tier | Max Width | WebP Quality | Typical Size | Primary Use Cases |
| :--- | :--- | :--- | :--- | :--- |
| **`thumb`** | `400px` | `0.80` (80%) | ~10–25 KB | Admin UI Media Library grid ([`MediaCard.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Media/components/MediaCard.tsx)), Media Picker modal, avatars (`testimonial`), icons (`feature-grid`). |
| **`md`** | `1024px` | `0.82` (82%) | ~60–120 KB | Mobile/tablet viewports, 2-column `text-image`, `gallery` grid cards, `image-carousel` slides, inline blog images. |
| **`lg`** (Base) | `2048px` | `0.85` (85%) | ~150–300 KB | Desktop high-DPI viewports, full-bleed `hero` backgrounds, post cover images. |

**Rules & Bypass Conditions:**
- **Never Upscale**: If an uploaded image is smaller than a target tier (e.g., an `800px` wide screenshot), `lg` and `md` are capped at the image's native `800px` width (and if a smaller variant is identical in dimensions to the base image, the redundant variant upload is skipped).
- **Non-Raster Bypass**: `image/svg+xml`, `image/gif` (to preserve animation), and `video/*` files bypass canvas re-encoding and upload as-is.
- **Filename Normalization**: Raster images converted to WebP have their extension normalized to `.webp` (e.g., `photo.JPG` -> `photo.webp`).

---

### 2.2 Deterministic R2 Suffixes & Single D1 Index Row

To ensure the Media Library shows **one clean card per uploaded image** (rather than 3 duplicate entries) and to work seamlessly with existing entry fields that store a single URL string (e.g., `"/media/1726700000000-photo.webp"`):

1. **D1 `media` Table**:
   - Continues to store **one row per logical asset**, keyed by the primary (`lg`) key: `1726700000000-photo.webp`.
2. **Cloudflare R2 Keys**:
   - Primary (`lg`): `1726700000000-photo.webp`
   - Medium (`md`): `1726700000000-photo__md.webp`
   - Thumbnail (`thumb`): `1726700000000-photo__thumb.webp`
3. **Upload Endpoint (`POST /api/media`)**:
   - Accepts either a `multipart/form-data` payload containing `file` (`lg`), optional `thumb`, and optional `md` blobs (or query-param variant uploads) and writes all provided tiers to R2 under the shared timestamp prefix before inserting the primary key into D1.
   - If the D1 insert fails, rolls back all uploaded R2 keys for that asset.
4. **R2-to-D1 Sync Filter (`sync_r2_to_d1`)**:
   - Update [`sync_r2_to_d1`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/public-worker/src/media.rs#L77-L91) in both `public-worker` and `admin-api-worker` to skip R2 object keys ending in `__thumb.webp` or `__md.webp` (via a shared `is_media_variant_key(key: &str) -> bool` helper in `zygo-core`).
5. **Cascading R2 Deletion (`DELETE /api/media/:key`)**:
   - When deleting `1726700000000-photo.webp`, also delete `1726700000000-photo__md.webp` and `1726700000000-photo__thumb.webp` from R2.

---

### 2.3 Worker `?size=` Resolution & Zero-Breakage Fallback

In [`packages/public-worker/src/media.rs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/public-worker/src/media.rs) and [`packages/admin-api-worker/src/media.rs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-api-worker/src/media.rs):

```mermaid
flowchart LR
    Req["GET /media/:key?size=thumb"] --> Check{"Is :key a .webp\nand size in [thumb, md]?"}
    Check -->|Yes| TryVar["Fetch :stem__:size.webp from R2"]
    TryVar -->|Found| ServeVar["Return Variant (200 OK,\nimmutable 1yr cache)"]
    TryVar -->|Not Found| Fallback["Fallback: Fetch base :key from R2"]
    Check -->|No (e.g. SVG or no ?size)| Fallback
    Fallback --> ServeBase["Return Base Asset (200 OK)"]
```

- When `GET /media/1726700000000-photo.webp?size=thumb` (or `?size=md`) is requested:
  1. Derive the variant key (`1726700000000-photo__thumb.webp`).
  2. Attempt `bucket.get(&variant_key)`.
  3. **Automatic Fallback**: If the variant object does not exist in R2 (e.g., legacy uploads created prior to this feature, small images that didn't require a split variant, or SVGs/GIFs), automatically fall back to `bucket.get(key)`.
- All responses retain `Cache-Control: public, max-age=31536000, immutable`.

---

### 2.4 Admin UI & Public `<img>` Tag Optimizations

1. **Admin UI Thumbnails**:
   - Update [`MediaCard.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Media/components/MediaCard.tsx) and `MediaPickerModal` to pass `?size=thumb` to `<MediaThumbnail>` for image assets, while keeping the "Copy URL" and Picker selection value as the clean canonical `/media/:key` URL.
2. **MiniJinja `media_srcset` Filter (`zygo-core` / `public-worker` / `template-wasm`)**:
   - Register a custom MiniJinja filter `media_srcset(url: &str) -> String`:
     - If `url` points to a local `/media/*.webp` (or `/api/media/*.webp`) asset, returns:
       `"{url}?size=thumb 400w, {url}?size=md 1024w, {url} 2048w"`
     - If `url` is an external URL or `.svg`/`.gif`, returns `""`.
3. **Built-in Section & Layout Template `<img>` Markup**:
   - Create a new D1 migration updating the built-in `section_templates` and `layout_templates`:
     - **`hero` Section**: Add `fetchpriority="high" decoding="async"` and `srcset="{{ image|media_srcset|safe }}" sizes="100vw"` to `.hero-media`.
     - **Below-the-Fold Sections (`text-image`, `gallery`, `image-carousel`)**: Add `loading="lazy" decoding="async"`, `srcset="{{ ...|media_srcset|safe }}"`, and appropriate `sizes` attributes (e.g., `(max-width: 768px) 100vw, 50vw` for `text-image`, `(max-width: 768px) 100vw, 320px` for `gallery`).
     - **Avatar / Icon Sections (`feature-grid`, `testimonial`)**: Use `src="{{ avatar|safe }}?size=thumb"` with `loading="lazy" decoding="async"`.
     - **Post Cover Image (`post` layout template)**: Add `fetchpriority="high" decoding="async"` and `srcset="{{ post.cover_image|media_srcset|safe }}" sizes="(max-width: 1024px) 100vw, 800px"`.
