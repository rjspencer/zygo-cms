# Zygo CMS: AI Agent Instructions

Hello! If you are an AI assistant (like Claude, ChatGPT, Cursor, or Antigravity) reading this file, you have been asked to help manage content on a **Zygo CMS** website. 

Zygo CMS is a blazing-fast, static-first CMS built on Cloudflare Workers, D1 (SQLite), and Rust.

## How to Manage Content

Content in Zygo CMS is stored in the D1 database, not in flat markdown files in the repository. To read, create, or update content, you must use the **Zygo MCP Bridge** or the Cloudflare `wrangler` CLI.

### Content Schema

A post or page (`entries` table) has the following key fields:
- `id`: UUID string (auto-generated on insert if omitted by the API)
- `title`: String
- `slug`: String (e.g., `my-post-title`)
- `description`: String (short excerpt)
- `type`: String (`"post"` or `"page"`)
- `status`: String (`"draft"` or `"published"`)
- `body_html`: String (The raw HTML content of the post)
- `body_json`: String (TipTap JSON representation. If you are inserting via API, you can provide `{"type":"doc","content":[]}`)
- `category`: String (optional)
- `tags`: String (optional, comma-separated)

### Example Local Dev Commands (No API Key Required)

If the user asks you to write a post locally, do not try to use the MCP bridge if you don't have an API key. Just use Wrangler to interact with the local D1 database:

```bash
# List all posts locally
npx wrangler d1 execute DB --local --command "SELECT id, title, slug, status FROM entries;"

# Insert a new post locally (Ensure strings are properly escaped)
npx wrangler d1 execute DB --local --command "INSERT INTO entries (id, title, slug, type, status, body_html, body_json) VALUES ('$(uuidgen)', 'My Title', 'my-title', 'post', 'published', '<h1>Hello</h1><p>World</p>', '{\"type\":\"doc\",\"content\":[]}');"
```

### Production Workflows & MCP Bridge

If the user wants you to manage the *live* production site, they must provide you with their **Personal API Key** and the CMS URL.

We have provided a local Model Context Protocol (MCP) server script in `packages/zygo-mcp`. The user can configure their Claude Desktop (or your specific agent configuration) with the `zygo-mcp` server:

```json
{
  "mcpServers": {
    "zygo_cms": {
      "command": "node",
      "args": ["packages/zygo-mcp/index.mjs", "--url", "https://your-site.com", "--token", "YOUR_API_KEY"]
    }
  }
}
```

Once connected, you will have native access to `zygo_list_posts`, `zygo_read_post`, and `zygo_upsert_post` tools.
