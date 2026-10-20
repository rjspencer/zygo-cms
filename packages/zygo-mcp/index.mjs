#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const isDirectRun = Boolean(process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));

// Parse CLI arguments
const args = process.argv.slice(2);
let url = "http://localhost:8787";
let clientId = process.env.CF_ACCESS_CLIENT_ID || "";
let clientSecret = process.env.CF_ACCESS_CLIENT_SECRET || "";

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) url = args[++i];
    if (args[i] === "--client-id" && args[i + 1]) clientId = args[++i];
    if (args[i] === "--client-secret" && args[i + 1]) clientSecret = args[++i];
}

url = url.replace(/\/$/, ""); // Remove trailing slash

if (isDirectRun && (!clientId || !clientSecret)) {
    console.error("Error: Both --client-id and --client-secret are required. Provide your Cloudflare Access Service Token credentials.");
    process.exit(1);
}

export const server = new Server(
    { name: "zygo-cms-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

// Define standard headers
export const getHeaders = (overrideClientId, overrideClientSecret) => ({
    "CF-Access-Client-Id": overrideClientId || clientId,
    "CF-Access-Client-Secret": overrideClientSecret || clientSecret,
    "Content-Type": "application/json"
});

export const getApiUrl = (path, overrideUrl) => {
    const base = (overrideUrl || url).replace(/\/$/, "");
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api')) {
        return `${base}${cleanPath}`;
    }
    return `${base}/api${cleanPath}`;
};

export const tools = [
            {
                name: "zygo_list_posts",
                description: "List all published posts in Zygo CMS.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "zygo_read_post",
                description: "Read a specific post by its slug.",
                inputSchema: {
                    type: "object",
                    properties: {
                        slug: { type: "string", description: "The slug of the post (e.g. 'hello-world')" }
                    },
                    required: ["slug"]
                }
            },
            {
                name: "zygo_upsert_post",
                description: "Create or update a post in Zygo CMS.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Optional UUID. If provided, updates existing post." },
                        title: { type: "string" },
                        slug: { type: "string" },
                        description: { type: "string" },
                        type: { type: "string", enum: ["post", "page"] },
                        status: { type: "string", enum: ["draft", "published"] },
                        body_html: { type: "string", description: "The raw HTML content of the post." },
                        body_json: { type: "string", description: "Optional TipTap JSON representation." },
                        category: { type: "string" },
                        tags: { type: "string", description: "Comma-separated tags." }
                    },
                    required: ["title", "slug", "type", "status", "body_html"]
                }
            },
            {
                name: "zygo_get_settings",
                description: "Get all site settings including branding (site_title, site_logo, site_logo_dark, site_favicon, default_og_image, footer_text), canonical_origin, docs, and analytics.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "zygo_update_settings",
                description: "Update site settings in the backend (e.g. site_title, site_logo, site_logo_dark, site_favicon, default_og_image, footer_text, canonical_origin, docs_path).",
                inputSchema: {
                    type: "object",
                    properties: {
                        settings: {
                            type: "object",
                            description: "Key-value map of settings to update (e.g. { site_logo: 'https://...', site_logo_dark: 'https://...', footer_text: '© 2026' })"
                        }
                    },
                    required: ["settings"]
                }
            },
            {
                name: "zygo_get_ai_crawl_settings",
                description: "Get Cloudflare AI Crawl Control edge settings (ai_bots_protection, ai_search, ai_training, ai_user).",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "zygo_update_ai_crawl_settings",
                description: "Update Cloudflare AI Crawl Control edge settings (ai_bots_protection, ai_search, ai_training, ai_user).",
                inputSchema: {
                    type: "object",
                    properties: {
                        ai_bots_protection: { type: "string", enum: ["block", "disabled"] },
                        ai_search: { type: "string", enum: ["block", "disabled"] },
                        ai_training: { type: "string", enum: ["block", "disallow", "disabled"] },
                        ai_user: { type: "string", enum: ["block", "disabled"] }
                    }
                }
            },
            {
                name: "zygo_clear_cache",
                description: "Purge all cached public pages at the Cloudflare edge and rotate the stylesheet hash so browsers reload CSS. Admin only.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "zygo_list_redirects",
                description: "List all 301 and 302 redirects in Zygo CMS.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "zygo_create_redirect",
                description: "Create a 301 or 302 redirect or vanity marketing URL in Zygo CMS.",
                inputSchema: {
                    type: "object",
                    properties: {
                        source_path: { type: "string", description: "Incoming URL path to redirect from (must start with '/')" },
                        target_url: { type: "string", description: "Target URL destination or internal path" },
                        status_code: { type: "number", description: "HTTP redirect status code (301 for permanent, 302 for temporary). Defaults to 301." },
                        notes: { type: "string", description: "Optional notes or campaign context" }
                    },
                    required: ["source_path", "target_url"]
                }
            },
            {
                name: "zygo_update_redirect",
                description: "Update an existing redirect by ID in Zygo CMS.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: "ID of the redirect to update" },
                        source_path: { type: "string", description: "Incoming URL path to redirect from" },
                        target_url: { type: "string", description: "Target URL destination or internal path" },
                        status_code: { type: "number", description: "HTTP redirect status code (301 or 302)" },
                        notes: { type: "string", description: "Optional notes or campaign context" }
                    },
                    required: ["id"]
                }
            },
            {
                name: "zygo_delete_redirect",
                description: "Delete a redirect by ID in Zygo CMS.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: "ID of the redirect to delete" }
                    },
                    required: ["id"]
                }
            },
            {
                name: "zygo_list_form_submissions",
                description: "List contact and newsletter form submissions with optional filtering by status, form name, or search query.",
                inputSchema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: ["unread", "read", "archived"],
                            description: "Optional status filter ('unread', 'read', 'archived')"
                        },
                        form_name: {
                            type: "string",
                            description: "Optional form name to filter by (e.g. 'contact', 'newsletter')"
                        },
                        q: {
                            type: "string",
                            description: "Optional search query to match against sender name, email, subject, or message content"
                        },
                        page: {
                            type: "number",
                            description: "Page number (default: 1)"
                        },
                        per_page: {
                            type: "number",
                            description: "Number of results per page (default: 20)"
                        }
                    }
                }
            },
            {
                name: "zygo_get_form_submission",
                description: "Get full details of a specific form submission by numeric ID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "number",
                            description: "The numeric ID of the form submission"
                        }
                    },
                    required: ["id"]
                }
            },
            {
                name: "zygo_update_form_submission_status",
                description: "Update the status of a form submission ('unread', 'read', or 'archived').",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "number",
                            description: "The numeric ID of the form submission"
                        },
                        status: {
                            type: "string",
                            enum: ["unread", "read", "archived"],
                            description: "New status for the submission ('unread', 'read', or 'archived')"
                        }
                    },
                    required: ["id", "status"]
                }
            },
            {
                name: "zygo_delete_form_submission",
                description: "Permanently delete a form submission by numeric ID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "number",
                            description: "The numeric ID of the form submission to delete"
                        }
                    },
                    required: ["id"]
                }
            }
        ];

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});

export async function handleCallTool(request, customContext = {}) {
    const activeUrl = customContext.url || url;
    const activeHeaders = getHeaders(customContext.clientId, customContext.clientSecret);
    const activeGetApiUrl = (path) => getApiUrl(path, activeUrl);

    try {
        if (request.params.name === "zygo_list_posts") {
            const res = await fetch(`${url}/posts`, { headers: getHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_read_post") {
            const { slug } = request.params.arguments;
            const res = await fetch(`${url}/posts`, { headers: getHeaders() }); 
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const posts = await res.json();
            const post = posts.find(p => p.slug === slug);
            if (!post) throw new Error(`Post not found with slug: ${slug}`);
            return { toolResult: post, content: [{ type: "text", text: JSON.stringify(post, null, 2) }] };
        }

        if (request.params.name === "zygo_upsert_post") {
            const args = request.params.arguments;
            const isUpdate = !!args.id;
            const endpoint = isUpdate ? `${url}/entries/${args.id}` : `${url}/entries`;
            const method = isUpdate ? "PUT" : "POST";

            // If body_json is missing, provide an empty doc
            if (!args.body_json) {
                args.body_json = JSON.stringify({ type: "doc", content: [] });
            }

            const res = await fetch(endpoint, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(args)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_get_settings") {
            const res = await fetch(getApiUrl('/settings'), { headers: getHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_settings") {
            const { settings } = request.params.arguments || {};
            const res = await fetch(getApiUrl('/settings'), {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ settings: settings || {} })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_get_ai_crawl_settings") {
            const res = await fetch(getApiUrl('/cloudflare/ai-crawl'), { headers: getHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_ai_crawl_settings") {
            const args = request.params.arguments || {};
            const res = await fetch(getApiUrl('/cloudflare/ai-crawl'), {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify(args)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_clear_cache") {
            const res = await fetch(getApiUrl('/cache/clear'), { method: "POST", headers: getHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_list_redirects") {
            const res = await fetch(getApiUrl('/redirects'), { headers: getHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_create_redirect") {
            const { source_path, target_url, status_code = 301, notes } = request.params.arguments || {};
            const res = await fetch(getApiUrl('/redirects'), {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    source_path,
                    target_url,
                    status_code: Number(status_code) || 301,
                    notes: notes || null
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_redirect") {
            const { id, source_path, target_url, status_code, notes } = request.params.arguments || {};
            if (!id) throw new Error("Redirect ID is required");
            const payload = {};
            if (source_path !== undefined) payload.source_path = source_path;
            if (target_url !== undefined) payload.target_url = target_url;
            if (status_code !== undefined) payload.status_code = Number(status_code);
            if (notes !== undefined) payload.notes = notes;

            const res = await fetch(getApiUrl(`/redirects/${id}`), {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_delete_redirect") {
            const { id } = request.params.arguments || {};
            if (!id) throw new Error("Redirect ID is required");
            const res = await fetch(getApiUrl(`/redirects/${id}`), {
                method: "DELETE",
                headers: getHeaders()
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_list_form_submissions") {
            const { status, form_name, q, page, per_page } = request.params.arguments || {};
            const params = new URLSearchParams();
            if (status) params.set("status", String(status));
            if (form_name) params.set("form_name", String(form_name));
            if (q) params.set("q", String(q));
            if (page != null) params.set("page", String(page));
            if (per_page != null) params.set("per_page", String(per_page));
            const qs = params.toString() ? `?${params.toString()}` : "";
            const res = await fetch(getApiUrl(`/submissions${qs}`), { headers: getHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_get_form_submission") {
            const { id } = request.params.arguments || {};
            const numId = Number(id);
            if (isNaN(numId) || numId <= 0) throw new Error("A valid numeric id is required");
            const res = await fetch(getApiUrl(`/submissions/${numId}`), { headers: getHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_form_submission_status") {
            const { id, status } = request.params.arguments || {};
            const numId = Number(id);
            if (isNaN(numId) || numId <= 0) throw new Error("A valid numeric id is required");
            if (!status || !["unread", "read", "archived"].includes(status)) {
                throw new Error("Status must be one of 'unread', 'read', or 'archived'");
            }
            const res = await fetch(getApiUrl(`/submissions/${numId}`), {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_delete_form_submission") {
            const { id } = request.params.arguments || {};
            const numId = Number(id);
            if (isNaN(numId) || numId <= 0) throw new Error("A valid numeric id is required");
            const res = await fetch(getApiUrl(`/submissions/${numId}`), {
                method: "DELETE",
                headers: getHeaders()
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            let data;
            try {
                data = await res.json();
            } catch {
                data = { success: true, id: numId };
            }
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        throw new Error(`Unknown tool: ${request.params.name}`);
    } catch (e) {
        return { isError: true, content: [{ type: "text", text: e.message }] };
    }
}

server.setRequestHandler(CallToolRequestSchema, (request) => handleCallTool(request));

// Run Server
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Zygo MCP Server running. Connected to ${url}`);
}

if (isDirectRun) {
    run().catch(console.error);
}
