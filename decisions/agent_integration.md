# Zygo CMS: Agent Integration Strategy & Recommendations

Based on a review of the current Zygo CMS architecture, `AGENTS.md`, `AI_AGENT_SKILL.md`, and the `zygo-mcp` package, here are detailed recommendations for improving how users and their AI agents interact with the CMS.

## 1. Expand the Model Context Protocol (MCP) Server
The current MCP server (`packages/zygo-mcp/index.mjs`) provides a solid foundation (`list_posts`, `read_post`, `upsert_post`), but it can be enhanced to support full end-to-end content management.

* **Media & Asset Management:** Agents often generate or source images. Add `zygo_upload_asset` (to upload files to Cloudflare R2 or the database) and `zygo_list_assets` tools. This allows agents to confidently embed images in `body_html`.
* **Full CRUD Capabilities:** Add a `zygo_delete_post` tool. Additionally, expose a way to list and manage `pages`, `categories`, and `tags` independently of posts.
* **Publish to npm:** Currently, users must point their agent config to a local `packages/zygo-mcp/index.mjs` path. Publishing this as an npm package (e.g., `npx @zygo-cms/mcp`) allows users to manage a production Zygo CMS from anywhere without cloning the repo.
* **Schema Validation & Error Handling:** Use `zod` within the MCP server to validate inputs before sending them to the Cloudflare Worker, providing clearer error messages back to the agent.

## 2. Dynamic Agent Documentation (`llms.txt`)
Instead of relying solely on the static `AI_AGENT_SKILL.md` in the repository, the live Zygo CMS application should serve its own agent instructions.

* **Implement `.well-known/llms.txt`:** The Cloudflare Worker should serve a route at `/.well-known/llms.txt` (or `/ai-plugin.json`) that provides context on how to interact with the API, where to find the OpenAPI spec, and schema details. Web-browsing agents can discover this automatically and learn how to navigate the CMS.

## 3. Server-Side TipTap JSON Generation
Currently, the `upsert_post` MCP tool requires `body_html` and optionally `body_json` (TipTap JSON). If `body_json` is missing, it falls back to an empty document `{"type":"doc","content":[]}`.

* **The Problem:** Agents are excellent at generating Markdown and HTML, but notoriously bad at generating perfectly structured TipTap JSON ASTs. 
* **The Solution:** The Cloudflare Worker (or the MCP server itself) should automatically parse `body_html` into TipTap JSON using TipTap's server-side utilities (`@tiptap/html` or similar). This allows agents to only provide HTML, ensuring the rich text editor on the frontend doesn't break due to missing or malformed JSON.

## 4. OpenAPI Specification for the REST API
MCP is great for desktop agents (Claude Desktop, Cursor), but cloud-based agent platforms (like ChatGPT Custom Actions or LangChain applications) often rely on OpenAPI.

* **Serve `openapi.json`:** Generate and serve an OpenAPI 3.0 specification from the Cloudflare Worker detailing the `/posts` and `/entries` endpoints.
* **API Key Auth:** Clearly document the PropelAuth Bearer token requirement within the OpenAPI security schemas so agents know how to authenticate.

## 5. Standardize IDE Rules (`.cursorrules`)
For users explicitly developing *on* the Zygo CMS codebase (not just managing content):

* **Symlink or Rename:** The `AGENTS.md` file contains excellent constraints (e.g., SQLite `ALTER TABLE` limits, `JsValue::null()` bindings, HappyDOM rules). You should copy or symlink this content into `.cursorrules` and/or `.windsurfrules`. This ensures that native IDE agents automatically load these rules without being explicitly pointed to `AGENTS.md`.

## 6. Abstract Local Database Commands
`AI_AGENT_SKILL.md` instructs agents to use raw SQL strings via `wrangler d1 execute DB --local --command "..."`. 

* **The Problem:** Raw SQL injection from LLMs is prone to syntax errors (escaping quotes in HTML bodies) and breaks if the database schema evolves.
* **The Solution:** Provide a lightweight local CLI tool (e.g., `npx zygo local insert --title "..." --body-html "..."`). This provides a stable, safe interface for agents to populate local test data without writing error-prone SQL strings.
