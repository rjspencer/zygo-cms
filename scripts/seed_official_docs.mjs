#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const pages = [
  {
    file: 'introduction.md',
    slug: 'docs',
    title: 'Introduction',
    path: '/docs',
    parentPath: null,
  },
  {
    file: 'quickstart.md',
    slug: 'quickstart',
    title: 'Quickstart',
    path: '/docs/quickstart',
    parentPath: '/docs',
  },
  {
    file: 'concepts.md',
    slug: 'concepts',
    title: 'Core Concepts',
    path: '/docs/concepts',
    parentPath: '/docs',
  },
  {
    file: 'examples.md',
    slug: 'examples',
    title: 'Common Examples',
    path: '/docs/examples',
    parentPath: '/docs',
  },
  {
    file: 'deployment.md',
    slug: 'deployment',
    title: 'Deployment Guide',
    path: '/docs/deployment',
    parentPath: '/docs',
  },
  {
    file: 'advanced.md',
    slug: 'advanced',
    title: 'Development & Advanced',
    path: '/docs/advanced',
    parentPath: '/docs',
  }
];

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

console.log('Building official documentation seed script...');

let queries = [];

for (let i = 0; i < pages.length; i++) {
  const page = pages[i];
  console.log(`Processing ${page.file}...`);
  const mdPath = path.join(ROOT_DIR, 'docs', 'official', page.file);
  
  // Convert Markdown to HTML using npx marked to avoid adding permanent dependencies
  let bodyHtml = '';
  try {
    bodyHtml = execSync(`npx -y marked "${mdPath}"`, { encoding: 'utf-8' });
  } catch (error) {
    console.error(`Failed to parse ${page.file} via marked.`);
    process.exit(1);
  }

  const bodyJson = "{}";
  let parentIdExpr = 'NULL';
  if (page.parentPath) {
    parentIdExpr = `(SELECT id FROM entries WHERE path = '${escapeSql(page.parentPath)}')`;
  }
  
  const query = `
    INSERT INTO entries (slug, title, type, status, body_html, body_json, path, parent_id, sort_order)
    VALUES (
      '${escapeSql(page.slug)}',
      '${escapeSql(page.title)}',
      'doc',
      'published',
      '${escapeSql(bodyHtml)}',
      '${escapeSql(bodyJson)}',
      '${escapeSql(page.path)}',
      ${parentIdExpr},
      ${i}
    )
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      type = excluded.type,
      body_html = excluded.body_html,
      body_json = excluded.body_json,
      path = excluded.path,
      parent_id = excluded.parent_id,
      sort_order = excluded.sort_order,
      updated_at = CURRENT_TIMESTAMP;
  `.trim();

  queries.push(query);
}

const sqlScript = queries.join('\n\n');
const tempSqlFile = path.join(ROOT_DIR, 'docs_seed_temp.sql');
writeFileSync(tempSqlFile, sqlScript);

// Determine target database: default to local unless --remote is passed
const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const targetArg = isRemote ? '--remote' : '--local';

console.log(`Executing SQL script against D1 database (${targetArg})...`);

try {
  execSync(`npx wrangler d1 execute zygo-cms-db ${targetArg} --file="${tempSqlFile}"`, { 
    stdio: 'inherit',
    cwd: ROOT_DIR 
  });
  console.log('Successfully seeded official documentation pages!');
} catch (error) {
  console.error('Failed to seed documentation pages:', error.message);
  process.exit(1);
} finally {
  try {
    unlinkSync(tempSqlFile);
  } catch (e) {}
}
