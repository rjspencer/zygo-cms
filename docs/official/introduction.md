# Zygo CMS Introduction

**Zygo CMS** is a modern, statically-generated style CMS built natively for Cloudflare Workers, D1 (SQLite), and Rust. It uniquely combines the unmatched speed and simplicity of a static site generator with the rich, dynamic capabilities of a traditional database-driven content management system. By leveraging the edge, Zygo CMS delivers content directly to users with minimal latency.

# Leaning into Cloudflare

Cloudflare offers a broad array of distributed internet solutions that span the globe. At a reasonable cost, even a small organization can serve their site at blazing fast speed across the globe. By focusing on Cloudflare's tools, Zygo CMS is but a few steps to setup and deploy, yet able to provide world-class hosting speeds.

## The Tech Stack & Benefits

Zygo CMS is engineered to provide high performance, robust security, and a seamless developer experience by utilizing a modern technology stack:

- **Cloudflare Caching and DNS:** Zygo's architecture is deeply integrated with Cloudflare's Edge Cache and global DNS. By serving rendered HTML pages and API responses directly from the cache, site speed is maximized. Smart cache invalidation automatically purges stale content the moment an update is published, ensuring visitors always see the freshest content instantly.
- **Cloudflare Workers:** True serverless execution directly at the edge. This provides zero cold-starts, seamless scaling, and global distribution, ensuring that your website's logic runs as close to the end user as physically possible.
- **Cloudflare D1:** Cloudflare's serverless SQLite database hosted across their edge network. D1 offers fast, relational data access without the need to provision, scale, or manage traditional database servers, significantly minimizing operational overhead.
- **Cloudflare R2:** Global object storage at the edge. R2 hosts images, videos, and other media assets with zero egress fees, seamlessly integrating with the Zygo CMS Media Library to deliver assets quickly worldwide.
- **Rust (Wasm):** The core business logic, routing, and API handling are written in Rust and compiled to WebAssembly (Wasm). Rust guarantees memory safety and predictable, blazing-fast performance without garbage collection pauses, making it an ideal choice for high-throughput edge environments.
- **React Admin UI:** A polished, fully decoupled modern dashboard built with React. It provides an intuitive interface for managing content, media, menus, and site settings without impacting the performance of the public-facing site.

## Three-Worker Architecture

To maximize security, performance, and developer ergonomics, Zygo CMS separates concerns into three distinct Cloudflare Workers sharing a D1 database and R2 storage bucket. This decoupled approach ensures that the public site remains hyper-optimized for read operations, while the administrative API and modern React 19 dashboard operate independently.

1. **`public-worker` (`packages/public-worker`) - Rust + Minijinja SSR (:8788):**
   An ultra-fast, read-only worker exclusively responsible for delivering your public website. It queries D1, renders HTML dynamically using the Minijinja templating engine with embedded layouts and D1-backed section templates, and heavily leverages Cloudflare's Edge Cache to serve pages instantly with zero cold-starts.

2. **`admin-api-worker` (`packages/admin-api-worker`) - Rust REST API (:8787):**
   A secure, feature-rich worker acting as the backend REST API for admin operations and AI agents. It handles Cloudflare Access authentication, data validation, media uploads to R2, workflow state transitions, dual content storage (`body_html` and `body_json` ProseMirror AST), and cache invalidation.

3. **`admin-ui` (`packages/admin-ui`) - React 19 SPA (:5173):**
   A modern single-page application built with React 19, Radix Themes, and TipTap. Deployed as a static asset worker at the edge, it communicates with the `admin-api-worker` via `/api` to provide an intuitive, responsive management experience for authors and administrators.

### Architecture Diagram

The following flowchart illustrates how traffic and data flow through the Zygo CMS Three-Worker Architecture:

```mermaid
flowchart TD
    EndUser(("End User"))
    AdminUser(("Admin User / Author"))
    
    CloudflareEdge{"Cloudflare Edge"}
    PublicWorker["Public Worker (:8788)\npackages/public-worker (Rust + Minijinja SSR)"]
    AdminAPIWorker["Admin API Worker (:8787)\npackages/admin-api-worker (Rust REST API)"]
    AdminUI["Admin UI (:5173)\npackages/admin-ui (React 19 SPA)"]
    D1Database[("D1 Database (SQLite)")]
    R2Storage[("R2 Media Storage")]

    EndUser -->|Visits example.com| CloudflareEdge
    CloudflareEdge -->|Routes Public Traffic| PublicWorker
    PublicWorker -->|Read-only Queries| D1Database

    AdminUser -->|Visits admin.example.com| CloudflareEdge
    CloudflareEdge -->|Serves Dashboard SPA| AdminUI
    AdminUI -->|API Requests /api| CloudflareEdge
    CloudflareEdge -->|Cloudflare Access Auth| AdminAPIWorker
    AdminAPIWorker -->|Read/Write Queries| D1Database
    AdminAPIWorker -->|Store/Retrieve Media| R2Storage
```

By strictly splitting these responsibilities across three dedicated workers, the public-facing site remains incredibly lightweight and fast, while the admin side retains all the necessary power for flexible, secure, and modern content management.
