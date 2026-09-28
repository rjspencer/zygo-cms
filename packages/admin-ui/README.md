# Zygo CMS Admin UI

A modern Single Page Application (SPA) administrative dashboard for Zygo CMS, built with Vite, React 19, and Radix Themes (`@radix-ui/themes`).

## Tech Stack
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **UI Components & Theming**: [Radix Themes](https://www.radix-ui.com/themes) + [Radix Icons](https://icons.modulz.app/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Deployment Target**: [Cloudflare Pages](https://pages.cloudflare.com/)

## Project Structure
```
packages/admin-ui/
├── public/
│   ├── _headers            # Security & asset caching headers for Cloudflare Pages
│   └── _redirects          # SPA client-side fallback rule (/* /index.html 200)
├── src/
│   ├── components/
│   │   └── Layout.tsx      # Admin dashboard shell (Sidebar, Header, Theme Toggle, Outlet)
│   ├── context/
│   │   └── ThemeModeContext.tsx # Light/Dark mode state management
│   ├── pages/
│   │   ├── Analytics.tsx   # Edge metrics & analytics
│   │   ├── ContentTypes.tsx# Content types schema builder
│   │   ├── Dashboard.tsx   # Overview dashboard with metrics & recent content
│   │   ├── Editor.tsx      # Post/Page editor with tabs and metadata pane
│   │   ├── Media.tsx       # Media library manager
│   │   ├── Navigation.tsx  # Menu builder (header & footer menus)
│   │   ├── NotFound.tsx    # 404 handler
│   │   ├── PagesList.tsx   # Static/landing pages list
│   │   ├── Posts.tsx       # Blog post management with search and delete dialog
│   │   └── Settings.tsx    # CMS configuration & edge runtime settings
│   ├── App.tsx             # Route definitions
│   ├── index.css           # Global resets and typography
│   └── main.tsx            # Application entrypoint with Radix Theme provider
├── index.html              # HTML entrypoint
├── package.json            # Scripts and dependencies
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration with /api proxy to worker
└── wrangler.toml           # Cloudflare Pages deployment configuration
```

## Available Scripts

### `npm run dev`
Starts the Vite local development server at `http://localhost:5173`. Requests prefixed with `/api` are automatically proxied to the backend Cloudflare Worker at `http://127.0.0.1:8787`.

### `npm run build`
Type-checks the codebase using `tsc` and bundles the SPA for production into `dist/`.

### `npm run preview`
Locally previews the production build in `dist/`.

## Cloudflare Pages Deployment

### 1. Build Settings
When connecting your Git repository to Cloudflare Pages:
- **Framework preset**: `None` / `Vite`
- **Root directory**: `packages/admin-ui`
- **Build command**: `npm run build`
- **Build output directory**: `dist`

### 2. SPA Routing & Deep Links
Cloudflare Pages serves client-side routed SPAs by redirecting unhandled paths to `/index.html`. This is pre-configured via `public/_redirects`:
```text
/*    /index.html   200
```

### 3. HTTP Security & Caching Headers
Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) and long-term cache headers for bundled assets are defined in `public/_headers`.

### 4. Direct Deployment via Wrangler CLI
You can also deploy directly using Wrangler:
```bash
npx wrangler pages deploy dist --project-name zygo-admin-ui
```
