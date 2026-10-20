#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const migrationPath = path.join(ROOT_DIR, 'migrations', '0012_new_preset_section_templates.sql');

// Determine target database: default to local unless --remote is passed
const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const targetArg = isRemote ? '--remote' : '--local';
const persistFlag = isRemote ? '' : '--persist-to=./.wrangler/state';

console.log(`\n========================================`);
console.log(` Zygo CMS - Seed Theme Preview Page (${isRemote ? 'REMOTE' : 'LOCAL'})`);
console.log(`========================================\n`);

try {
  console.log(`Applying migration and seeding /theme-preview page with all 15 section templates...`);
  execSync(`npx wrangler d1 execute zygo-cms-db ${targetArg} ${persistFlag} --file="${migrationPath}"`, {
    stdio: 'inherit',
    cwd: ROOT_DIR,
  });
  console.log(`\n✓ Successfully seeded /theme-preview page and updated all 15 preset section templates!\n`);
} catch (error) {
  console.error('\n❌ Failed to seed theme preview page:', error.message);
  process.exit(1);
}
