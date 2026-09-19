#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Parse CLI arguments
const args = process.argv.slice(2);
let url = "http://localhost:8787";
let token = "";

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) url = args[++i];
    if (args[i] === "--token" && args[i + 1]) token = args[++i];
}

url = url.replace(/\/$/, ""); // Remove trailing slash

if (!token) {
    console.error("Error: --token is required. Provide your PropelAuth Personal API Key.");
    process.exit(1);
}

const server = new Server(
    { name: "zygo-cms-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

// Define standard headers
const getHeaders = () => ({
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
});

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
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
            }
        ]
    };
});

// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
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

        throw new Error(`Unknown tool: ${request.params.name}`);
    } catch (e) {
        return { isError: true, content: [{ type: "text", text: e.message }] };
    }
});

// Run Server
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Zygo MCP Server running. Connected to ${url}`);
}

run().catch(console.error);
