import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';

describe('zygo-mcp CLI server', () => {
    it('initializes and lists tools including zygo_get_settings and zygo_update_settings', async () => {
        const mcpPath = path.resolve('packages/zygo-mcp/index.mjs');
        const child = spawn(
            'node',
            [mcpPath, '--url', 'http://localhost:8787', '--client-id', 'test-client-id', '--client-secret', 'test-client-secret'],
            { stdio: ['pipe', 'pipe', 'pipe'] }
        );

        const initRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'test-client', version: '1.0.0' },
            },
        };

        const listToolsRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {},
        };

        let stdoutData = '';

        const resultPromise = new Promise((resolve, reject) => {
            child.stdout.on('data', (chunk) => {
                stdoutData += chunk.toString();
                const lines = stdoutData.split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.id === 2) {
                            resolve(parsed);
                        }
                    } catch {
                        // Incomplete JSON line yet
                    }
                }
            });

            child.stderr.on('data', () => {});

            child.on('error', reject);
            child.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`MCP process exited with code ${code}`));
                }
            });
        });

        child.stdin.write(JSON.stringify(initRequest) + '\n');
        child.stdin.write(JSON.stringify(listToolsRequest) + '\n');

        const response = await resultPromise;
        expect(response.result).toBeDefined();
        expect(response.result.tools).toBeInstanceOf(Array);

        const toolNames = response.result.tools.map((t) => t.name);
        expect(toolNames).toContain('zygo_get_settings');
        expect(toolNames).toContain('zygo_update_settings');
        expect(toolNames).toContain('zygo_list_posts');
        expect(toolNames).toContain('zygo_read_post');
        expect(toolNames).toContain('zygo_upsert_post');

        const getSettingsTool = response.result.tools.find((t) => t.name === 'zygo_get_settings');
        expect(getSettingsTool.description).toContain('branding');

        const updateSettingsTool = response.result.tools.find((t) => t.name === 'zygo_update_settings');
        expect(updateSettingsTool.inputSchema.properties.settings).toBeDefined();

        child.kill();
    });
});
