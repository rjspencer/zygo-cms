# Custom Domain & DNS Setup Guide

This guide walks you through configuring Zygo CMS on your own custom domain using Cloudflare Workers Custom Domains.

---

## 1. Overview of the 3-Worker Architecture

Zygo CMS is split across three decoupled workers, each serving a distinct role and hosted on its own hostname:

| Package | Worker Name | Hostname Pattern | Purpose |
| :--- | :--- | :--- | :--- |
| `packages/public-worker` | `public-worker` | `example.com`<br>`www.example.com` | Public-facing website (SSR HTML, blog entries, assets, RSS, sitemap) |
| `packages/admin-api-worker` | `admin-api-worker` | `api.example.com` | Protected REST API (content CRUD, auth verification, media management) |
| `packages/admin-ui` | `admin-ui-worker` | `admin.example.com` | Admin dashboard single-page application (React + Vite) |

Cloudflare Workers **Custom Domains** attach each worker directly to your hostnames at the edge, providing automatic TLS/SSL certificate generation and low-latency global routing without requiring manual DNS records or origin servers.

---

## 2. Prerequisites

Before deploying Zygo CMS to your custom domain, make sure you have the following ready:

### 1. Active Cloudflare Zone
Your domain (e.g., `example.com`) must be registered on Cloudflare or delegated to Cloudflare's authoritative nameservers with an active zone status.

### 2. Cloudflare API Token
Create an API Token in the [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) (**My Profile** > **API Tokens** > **Create Token**) with the following permissions:

| Scope | Resource | Permission |
| :--- | :--- | :--- |
| **Account** | Workers Scripts | **Edit** |
| **Zone** | Workers Routes | **Edit** |
| **Zone** | DNS | **Edit** |
| **Zone** | Zone | **Read** |

Set the Zone resources to include **All zones** (or specifically your target domain).

### 3. GitHub Secrets
Add your Cloudflare credentials as repository secrets in GitHub (**Settings** > **Secrets and variables** > **Actions**):

- `CLOUDFLARE_API_TOKEN`: The API token created above.
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID (found on the right sidebar of your Cloudflare zone overview page or under **Workers & Pages** > **Overview**).

---

## 3. Configuring Your Domain in the Codebase

Update the `wrangler.toml` files across the three packages to specify your own domain instead of the default placeholder.

### 1. Public Worker (`packages/public-worker/wrangler.toml`)
Configure both the apex domain and `www` subdomain:

```toml
routes = [
  { pattern = "example.com", custom_domain = true },
  { pattern = "www.example.com", custom_domain = true }
]
```

### 2. Admin API Worker (`packages/admin-api-worker/wrangler.toml`)
Configure the `api` subdomain:

```toml
routes = [
  { pattern = "api.example.com", custom_domain = true }
]
```

### 3. Admin UI Worker (`packages/admin-ui/wrangler.toml`)
Configure the `admin` subdomain:

```toml
routes = [
  { pattern = "admin.example.com", custom_domain = true }
]
```

> **Note:** The `custom_domain = true` property tells Cloudflare to register these hostnames as Custom Domains rather than traditional route patterns, automatically routing traffic directly to the worker at the Cloudflare edge.

---

## 4. DNS Preparation & Conflict Prevention (Important Gotcha)

When Cloudflare attaches a Worker Custom Domain, it automatically creates and manages internal routing entries and provisions an SSL certificate. However, **Cloudflare will refuse to overwrite existing DNS records for the same hostname.**

If pre-existing `A`, `AAAA`, or `CNAME` records exist, deployment will fail with an error similar to:
```
Error: An externally managed DNS record already exists for this domain
```

### Required Actions Before Deployment

1. Open your [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to your domain's **DNS** > **Records** tab.
2. Locate and **delete** any existing `A`, `AAAA` (including placeholder IPv6 records like `100::`), or `CNAME` records for:
   - `@` (Apex domain)
   - `www`
   - `api`
   - `admin`
3. Do **not** manually recreate DNS records for these hostnames. Cloudflare will automatically synthesize and manage the DNS routing when your workers are deployed.

### What Records to Keep

Do not delete unrelated DNS records:
- **MX Records:** Keep your mail exchange records intact so your email service continues working uninterrupted.
- **TXT Records:** Keep verification and security records (such as SPF, DKIM, DMARC, or site ownership tags).
- **Third-Party Subdomains:** Keep records for external services (e.g., `auth.example.com` pointing to Cloudflare Access or another identity provider).

---

## 5. Deploying & Verifying

### 1. Automated Deployment via GitHub Actions

Commit your updated `wrangler.toml` configurations and push to your `main` branch:

```bash
git add packages/public-worker/wrangler.toml packages/admin-api-worker/wrangler.toml packages/admin-ui/wrangler.toml
git commit -m "Configure custom domains for production"
git push origin main
```

The GitHub Actions CI/CD workflow (`.github/workflows/deploy.yml`) will automatically:
1. Run the test suite (Rust unit tests and browser DOM tests).
2. Build all three packages.
3. Run any pending D1 database migrations.
4. Deploy `public-worker`, `admin-api-worker`, and `admin-ui` to Cloudflare Workers.

### 2. Verifying in the Cloudflare Dashboard

Once deployment finishes:
1. In Cloudflare, navigate to **Workers & Pages**.
2. Select one of your workers (e.g., `public-worker`).
3. Click **Settings** > **Domains & Routes**.
4. Under **Custom Domains**, you should see your domain listed with status **Active** and a green checkmark indicating the SSL certificate has been issued.

### 3. Verifying via CLI

You can verify that DNS resolution is live using `dig`:

```bash
dig +short example.com
dig +short www.example.com
dig +short api.example.com
dig +short admin.example.com
```

All queries should return Cloudflare Anycast IP addresses.

Next, test connectivity with `curl`:

```bash
# Check the public worker
curl -I https://example.com

# Check the admin API worker
curl -I https://api.example.com/api/health

# Check the admin UI SPA
curl -I https://admin.example.com
```

Your Zygo CMS installation is now live and serving traffic securely from your custom domain!
