import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SEED_SCRIPT_PATH = path.join(ROOT_DIR, 'scripts', 'seed_official_docs.mjs');
const DOCS_DIR = path.join(ROOT_DIR, 'docs', 'official');

function extractPagesFromSeedScript(scriptPath) {
  const fileContent = fs.readFileSync(scriptPath, 'utf-8');
  const match = fileContent.match(/const\s+pages\s*=\s*(\[\s*[\s\S]*?\n\s*\]);/);
  if (!match) {
    throw new Error('Failed to find "const pages = [...]" definition in scripts/seed_official_docs.mjs');
  }
  return vm.runInNewContext(match[1]);
}

describe('Documentation Integrity Test Suite', () => {
  const seedScriptExists = fs.existsSync(SEED_SCRIPT_PATH);
  const pages = seedScriptExists ? extractPagesFromSeedScript(SEED_SCRIPT_PATH) : [];
  const officialMdFiles = fs.existsSync(DOCS_DIR)
    ? fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md')).sort()
    : [];

  it('successfully extracts the pages array from scripts/seed_official_docs.mjs', () => {
    expect(seedScriptExists).toBe(true);
    expect(Array.isArray(pages)).toBe(true);
    expect(pages.length).toBeGreaterThan(0);
  });

  describe('Registered Pages Schema & Properties', () => {
    it('ensures all slug properties are unique', () => {
      const slugs = pages.map((p) => p.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });

    it('ensures all slug properties follow valid slug format (lowercase alphanumeric and hyphens)', () => {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      for (const page of pages) {
        expect(page.slug, `Page ${page.file} slug "${page.slug}" is invalid`).toMatch(slugRegex);
      }
    });

    it('ensures all path properties are unique and start with /docs', () => {
      const paths = pages.map((p) => p.path);
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(paths.length);

      for (const page of pages) {
        expect(page.path.startsWith('/docs'), `Page ${page.file} path "${page.path}" must start with /docs`).toBe(true);
      }
    });

    it('ensures all parentPath properties are either null or match an existing page path', () => {
      const validPaths = new Set(pages.map((p) => p.path));
      for (const page of pages) {
        if (page.parentPath !== null) {
          expect(
            validPaths.has(page.parentPath),
            `Page ${page.file} parentPath "${page.parentPath}" does not match any registered path`
          ).toBe(true);
        }
      }
    });
  });

  describe('Filesystem and Seed Synchronization', () => {
    it('ensures every file registered in pages exists in docs/official/ with non-empty content', () => {
      for (const page of pages) {
        const filePath = path.join(DOCS_DIR, page.file);
        expect(fs.existsSync(filePath), `File "${page.file}" registered in seed script does not exist at ${filePath}`).toBe(true);

        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content.trim().length, `File "${page.file}" must not be empty`).toBeGreaterThan(0);
      }
    });

    it('ensures every markdown document in docs/official/ is registered in pages', () => {
      const registeredFiles = new Set(pages.map((p) => p.file));
      for (const mdFile of officialMdFiles) {
        expect(
          registeredFiles.has(mdFile),
          `Markdown file "${mdFile}" in docs/official/ is not registered in scripts/seed_official_docs.mjs`
        ).toBe(true);
      }
    });
  });

  describe('Internal Documentation Link Resolution', () => {
    it('ensures internal Markdown links pointing to /docs/... resolve to a valid registered page path', () => {
      const validPaths = new Set(pages.map((p) => p.path));
      const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;

      const unresolvableLinks = [];

      for (const mdFile of officialMdFiles) {
        const filePath = path.join(DOCS_DIR, mdFile);
        const content = fs.readFileSync(filePath, 'utf-8');

        let match;
        while ((match = markdownLinkRegex.exec(content)) !== null) {
          const targetUrl = match[2].trim();
          if (targetUrl.startsWith('/docs')) {
            // Strip anchor/fragment and query parameters if present
            const basePath = targetUrl.split('#')[0].split('?')[0];
            if (!validPaths.has(basePath)) {
              unresolvableLinks.push({
                file: mdFile,
                link: targetUrl,
                basePath,
              });
            }
          }
        }
      }

      expect(
        unresolvableLinks,
        `Found internal /docs links that do not resolve to registered paths: ${JSON.stringify(unresolvableLinks, null, 2)}`
      ).toEqual([]);
    });
  });
});
