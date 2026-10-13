#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.resolve(ROOT_DIR, 'packages/admin-api-worker/wrangler.toml');

const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const autoConfirm = args.includes('--yes') || args.includes('-y') || process.env.CI === 'true';

const targetFlag = isRemote ? '--remote' : '--local';
const persistFlag = isRemote ? '' : '--persist-to=./.wrangler/state';
const dbName = 'zygo-cms-db';

async function confirmPrompt(message) {
  if (autoConfirm) return true;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

function runWrangler(cmd, options = {}) {
  return execSync(cmd, {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    env: { ...process.env, CI: 'true' },
    ...options,
  });
}

async function main() {
  console.log(`\n========================================`);
  console.log(` Zygo CMS - D1 Database Reset (${isRemote ? 'REMOTE' : 'LOCAL'})`);
  console.log(`========================================\n`);

  if (isRemote) {
    console.log(`⚠️  WARNING: You are about to reset the REMOTE production/preview D1 database!`);
    console.log(`   All existing entries, users, templates, and media records will be permanently erased.`);
    console.log(`   The database ID in wrangler.toml will remain UNCHANGED.\n`);
    const confirmed = await confirmPrompt(`Are you sure you want to proceed? (y/N): `);
    if (!confirmed) {
      console.log('Reset cancelled.');
      process.exit(0);
    }
  }

  // Step 1: Query existing tables/views/triggers to dynamically drop all objects
  console.log(`[1/2] Clearing all database tables and migration history...`);

  let dropSql = `
PRAGMA foreign_keys = OFF;
DROP TRIGGER IF EXISTS entries_ai;
DROP TRIGGER IF EXISTS entries_ad;
DROP TRIGGER IF EXISTS entries_au;
DROP TABLE IF EXISTS search_index;
DROP TABLE IF EXISTS search_index_config;
DROP TABLE IF EXISTS search_index_data;
DROP TABLE IF EXISTS search_index_docsize;
DROP TABLE IF EXISTS search_index_idx;
DROP TABLE IF EXISTS section_template_revisions;
DROP TABLE IF EXISTS trackable_links;
DROP TABLE IF EXISTS section_templates;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS menus;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS entry_revisions;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS d1_migrations;
PRAGMA foreign_keys = ON;
`;

  try {
    const queryCmd = `npx wrangler d1 execute ${dbName} ${targetFlag} ${persistFlag} -c ${CONFIG_PATH} --command="SELECT name, type FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type DESC, name;" --json`;
    const out = runWrangler(queryCmd, { stdio: ['pipe', 'pipe', 'pipe'] });
    const parsed = JSON.parse(out);
    const rows = parsed[0]?.results || [];

    if (rows.length > 0) {
      const dynamicDrops = [];
      dynamicDrops.push('PRAGMA foreign_keys = OFF;');
      for (const item of rows) {
        if (item.type === 'trigger') {
          dynamicDrops.push(`DROP TRIGGER IF EXISTS "${item.name}";`);
        } else if (item.type === 'view') {
          dynamicDrops.push(`DROP VIEW IF EXISTS "${item.name}";`);
        } else if (item.type === 'table') {
          dynamicDrops.push(`DROP TABLE IF EXISTS "${item.name}";`);
        }
      }
      dynamicDrops.push('DROP TABLE IF EXISTS d1_migrations;');
      dynamicDrops.push('PRAGMA foreign_keys = ON;');
      dropSql = dynamicDrops.join('\n');
    }
  } catch (err) {
    // If listing fails (e.g. database uninitialized), fall back to the static drop list
  }

  const tempDropFile = path.resolve(ROOT_DIR, '.tmp_reset_drop.sql');
  writeFileSync(tempDropFile, dropSql, 'utf-8');

  try {
    const executeDropCmd = `npx wrangler d1 execute ${dbName} ${targetFlag} ${persistFlag} -c ${CONFIG_PATH} --file="${tempDropFile}"`;
    runWrangler(executeDropCmd, { stdio: 'inherit' });
    console.log(`✓ Database cleared successfully (Cloudflare Database ID preserved)`);
  } finally {
    try {
      unlinkSync(tempDropFile);
    } catch {
      // ignore
    }
  }

  // Step 2: Apply all migrations (this creates tables AND seeds built-in content)
  console.log(`\n[2/2] Running migrations and seeding built-in templates & content...`);
  const migrateCmd = `npx wrangler d1 migrations apply ${dbName} ${targetFlag} ${persistFlag} -c ${CONFIG_PATH}`;
  runWrangler(migrateCmd, { stdio: 'inherit' });

  console.log(`\n✓ Database reset complete! All tables migrated and seeded without changing the database ID.\n`);
}

main().catch((err) => {
  console.error('\n❌ Database reset failed:', err.message);
  process.exit(1);
});
