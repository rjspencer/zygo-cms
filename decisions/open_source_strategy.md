# Open Source Strategy for Zygo CMS

To transition Zygo CMS from a personal codebase to a successful open-source starter project, the focus must shift toward **reducing time-to-first-success**, **simplifying configuration**, and **embracing AI-assisted workflows**.

Below is a detailed strategy across four key areas: Repository Structure, Documentation, Automation Scripts, and AI Optimization.

---

## 1. Project Structure & Repository Changes

Currently, Zygo CMS is structured as a monolithic application. To make it a reusable template, we need to adapt it into a "Starter Kit" model (similar to `create-next-app` or Astro templates).

- **Environment Variable Scaffolding:** 
  Users shouldn't have to guess what goes into `.dev.vars`. Add a `.dev.vars.example` file to the repository containing placeholder values for `PROPELAUTH_AUTH_URL` and `PROPELAUTH_API_KEY`.
- **Database Seeding:**
  When a user boots the CMS for the first time, it shouldn't be empty. Add a `scripts/seed.sql` file containing a "Hello World" post and a sample "About" page so they immediately see the UI functioning.
- **Template Parameterization:**
  Hardcoded names like `"zygo-cms"` or `"zygo-cms-db"` in `package.json`, `Cargo.toml`, and `wrangler.toml` need to be easily replaceable. 
- **Separation of Core vs. Theme (Future Phase):**
  Currently, the Rust backend, templates, and static assets are mixed. In the short term, this is fine for a starter template. In the long term, consider moving the core routing and D1 logic into a published Cargo crate (`zygo-core`), leaving only `src/lib.rs` (as a thin wrapper), `templates/`, and `public/` in the starter template.

---

## 2. Documentation Needs

The current `README.md` is an excellent technical summary, but it needs to be broken down into task-oriented guides for users with varying levels of Rust or Cloudflare experience.

- **Zero-to-Hero Quickstart:** 
  A 5-step guide front-and-center in the README to get the site running locally within minutes.
- **PropelAuth Setup Guide (`docs/auth.md`):** 
  PropelAuth is the biggest external dependency. Provide a dedicated guide with screenshots detailing exactly how to create an account, find the Auth URL, and generate Server API keys.
- **Theming & Customization (`docs/theming.md`):** 
  Explain how Askama (`templates/`) interfaces with the Rust backend. Show users how to modify Tailwind configurations (`src/style.css`), add custom fonts, and adjust the UI.
- **Deployment & CI/CD (`docs/deployment.md`):**
  While `wrangler deploy` works locally, production projects should use GitHub Actions. Provide a `.github/workflows/deploy.yml` template and document the necessary GitHub Secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
- **Architecture Diagram:**
  A visual diagram (e.g., Mermaid.js) showing the request lifecycle: Request -> Edge Worker -> PropelAuth (if admin) -> D1 SQLite -> Askama Render -> Response.

---

## 3. Automation & Scripts

To make setup effortless, we should encapsulate complex Wrangler and Cargo commands into intuitive npm scripts.

### Proposed `package.json` Additions

```json
"scripts": {
  "setup": "node scripts/setup.js",
  "db:init": "wrangler d1 migrations apply zygo-cms-db --local && npm run db:seed",
  "db:seed": "wrangler d1 execute zygo-cms-db --local --file=./scripts/seed.sql",
  "deploy:init": "node scripts/create-cf-resources.js"
}
```

### Key Scripts to Write

1. **`scripts/setup.js` (or `create-zygo` npx package):**
   An interactive initialization script that prompts the user for their Project Name and PropelAuth URL. It automatically rewrites `wrangler.toml`, `Cargo.toml`, and `package.json` with the new project name, copies `.dev.vars.example` to `.dev.vars`, and runs `npm run db:init`.
2. **`scripts/create-cf-resources.js`:**
   A helper script that runs `wrangler d1 create <name>` and `wrangler r2 bucket create <name>`, parses the JSON output to extract the new `database_id`, and automatically injects it back into `wrangler.toml` so the user doesn't have to copy-paste IDs.

---

## 4. Optimizing for AI Agents

Zygo is already positioned well with the `packages/zygo-mcp` bridge. We can go further to make Zygo the most "AI-friendly" CMS available.

- **Native AI Tooling (`.cursorrules` / `.windsurfrules`):**
  Add root-level configuration files for popular AI IDEs (Cursor, Windsurf, Antigravity). These files should point directly to `AGENTS.md`, ensuring that any AI assisting the user immediately understands the Rust + Cloudflare + Askama stack and the SQLite D1 limitations.
- **AI Setup Assistant Prompt (`docs/AI_SETUP_INSTRUCTIONS.md`):**
  Provide a copy-paste prompt that users can drop into ChatGPT or Claude to have the AI guide them through the Cloudflare and PropelAuth setup process step-by-step.
- **Expand the MCP Server:**
  Currently, the MCP bridge allows AIs to read and write content. Expand this to allow AIs to read database schemas, trigger database backups, or even scaffold new Askama templates and Tailwind components directly onto the live site.
- **Automated Content Generation:**
  Include a Python or Node script utilizing the MCP bridge (or standard API) that allows users to ask an AI to "Generate a complete dummy blog with 10 varied posts about web development" to instantly flesh out their local development environment for UI testing.
