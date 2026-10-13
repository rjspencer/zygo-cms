#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const adminUiSrc = path.join(repoRoot, 'packages/admin-ui/src');

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

// 1. Extract registered tools from webmcp files and WebMCPProvider
const toolSourceFiles = [
  'providers/WebMCPProvider.tsx',
  'lib/webmcp/entryTools.ts',
  'lib/webmcp/templateTools.ts',
  'lib/webmcp/themeAndMediaTools.ts',
];

const discoveredTools = [];
for (const relPath of toolSourceFiles) {
  const fullPath = path.join(adminUiSrc, relPath);
  const content = readFileSafe(fullPath);
  const regex = /name:\s*'([a-z0-9_]+)'[\s\S]*?description:\s*'([^']+)'/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    discoveredTools.push({
      name: match[1],
      description: match[2],
      source: relPath,
    });
  }
}

// 2. Check Browser Global Bridges
const registryContent = readFileSafe(path.join(adminUiSrc, 'lib/webmcp/registry.ts'));
const hasWindowWebmcp = registryContent.includes('window.webmcp');
const hasNavigatorModelContext = registryContent.includes('navigator.modelContext');

// 3. Audit Editor & Page components
const editorTargets = [
  { name: 'Entry Editor (Page/Post/Doc)', relPath: 'pages/Editor.tsx' },
  { name: 'Template Editor', relPath: 'pages/TemplateEditor.tsx' },
  { name: 'Theme Editor', relPath: 'components/ThemeEditor/ThemeEditor.tsx' },
  { name: 'Navigation Editor', relPath: 'pages/Navigation.tsx' },
  { name: 'Media Library', relPath: 'pages/Media.tsx' },
  { name: 'Settings Page', relPath: 'pages/Settings.tsx' },
];

const editorReport = editorTargets.map((target) => {
  const content = readFileSafe(path.join(adminUiSrc, target.relPath));
  const hooks = [];
  if (content.includes('useTipTapWebMCP')) hooks.push('useTipTapWebMCP');
  if (content.includes('useTemplateEditorWebMCP')) hooks.push('useTemplateEditorWebMCP');
  if (content.includes('useThemeEditorWebMCP')) hooks.push('useThemeEditorWebMCP');
  if (content.includes('useRegisterWebMCPTools')) hooks.push('useRegisterWebMCPTools');

  const hasSaveOrMutation =
    content.includes('handleSave') ||
    content.includes('useMutation') ||
    content.includes('onSave');

  const wiresSaveToWebMCP =
    content.includes('onSaveDraft:') ||
    content.includes('onPublish:') ||
    content.includes('onSave:');

  let status = 'OK';
  if (hooks.length === 0 && hasSaveOrMutation) {
    status = 'GAP: No active WebMCP hook mounted (relies on global API tools only)';
  } else if (hooks.length > 0 && hasSaveOrMutation && !wiresSaveToWebMCP) {
    status = 'PARTIAL: WebMCP hook mounted, but native Save handler not wired';
  }

  return {
    editor: target.name,
    file: target.relPath,
    hooks: hooks.join(', ') || 'None',
    status,
  };
});

console.log('=== Zygo CMS WebMCP Parity Audit ===\n');
console.log(
  `Browser Bridges: window.webmcp=${hasWindowWebmcp ? 'ACTIVE' : 'MISSING'} | navigator.modelContext=${hasNavigatorModelContext ? 'ACTIVE' : 'MISSING'}`
);
console.log(`Total Discovered WebMCP Tools: ${discoveredTools.length}\n`);

console.log('--- Registered Tools by Source ---');
for (const tool of discoveredTools) {
  console.log(`  • ${tool.name.padEnd(32)} [${tool.source}] — ${tool.description}`);
}

console.log('\n--- Editor Lifecycle Parity Status ---');
for (const row of editorReport) {
  console.log(`  • ${row.editor.padEnd(30)} (${row.file})`);
  console.log(`      Hooks:  ${row.hooks}`);
  console.log(`      Status: ${row.status}`);
}
