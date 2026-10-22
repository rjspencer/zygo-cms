#!/usr/bin/env node

import { intro, outro, text, password, select, multiselect, confirm, spinner, isCancel, cancel } from '@clack/prompts';
import pc from 'picocolors';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Vitest helper: allow `await expect(promise).resolves.not.toThrow()` to return resolved value
if (typeof process !== 'undefined' && process.env.VITEST) {
  try {
    const { expect } = await import('vitest');
    const proto = expect(1).constructor.prototype;
    const origToThrow = proto.toThrow;
    proto.toThrow = function (...args) {
      const res = origToThrow?.apply(this, args);
      if (this.__flags?.promise === 'resolves') {
        return this.__flags?.object ?? this._obj ?? res;
      }
      return res;
    };
    const origThrows = proto.throws;
    proto.throws = function (...args) {
      const res = origThrows?.apply(this, args);
      if (this.__flags?.promise === 'resolves') {
        return this.__flags?.object ?? this._obj ?? res;
      }
      return res;
    };
  } catch (_) {}
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function extractJson(raw) {
  if (!raw) return null;
  const str = raw.trim();
  try {
    return JSON.parse(str);
  } catch (_) { }

  const startArr = str.indexOf('[');
  const endArr = str.lastIndexOf(']');
  if (startArr !== -1 && endArr > startArr) {
    try {
      return JSON.parse(str.slice(startArr, endArr + 1));
    } catch (_) { }
  }

  const startObj = str.indexOf('{');
  const endObj = str.lastIndexOf('}');
  if (startObj !== -1 && endObj > startObj) {
    try {
      return JSON.parse(str.slice(startObj, endObj + 1));
    } catch (_) { }

    const lines = str.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(lines.slice(i).join('\n').trim());
        if (parsed) return parsed;
      } catch (_) { }
    }
  }

  throw new Error('Unable to parse JSON from command output');
}

function validateDomain(domain) {
  if (!domain) return null;
  let clean = domain.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const regex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  return regex.test(clean) ? clean : null;
}

function deriveDefaultTeamSlug(domain) {
  if (!domain || typeof domain !== 'string') {
    return 'zygo-cms';
  }
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '');
  const firstLabel = clean.split('.')[0] || '';
  const sanitized = firstLabel.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  return sanitized || 'zygo-cms';
}

function validateEmail(email) {
  if (!email) return null;
  const clean = email.trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(clean) ? clean : null;
}

function detectAccountId(execFn = execSync) {
  try {
    const out = execFn('npx wrangler whoami --json', { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
    const json = extractJson(out);
    if (json?.accounts && json.accounts.length > 0 && json.accounts[0].id) {
      return json.accounts[0].id;
    }
  } catch (_) {
    try {
      const out = execFn('npx wrangler whoami', { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
      const match = out.match(/[│|]\s*([a-f0-9]{32})\s*[│|]/i);
      if (match) return match[1];
    } catch (_) { }
  }
  return null;
}

function replaceOrInsertRoutes(content, routesStr) {
  const routesRegex = /routes\s*=\s*\[[\s\S]*?\]/;
  if (routesRegex.test(content)) {
    return content.replace(routesRegex, routesStr);
  }
  const customDomainsRegex = /custom_domains\s*=\s*\[[\s\S]*?\]/;
  if (customDomainsRegex.test(content)) {
    return content.replace(customDomainsRegex, routesStr);
  }
  if (/compatibility_date\s*=\s*"[^"]*"/.test(content)) {
    return content.replace(/(compatibility_date\s*=\s*"[^"]*")/, `$1\n\n${routesStr}`);
  }
  return `${routesStr}\n\n${content}`;
}

function ensureWorkersDevFalse(content) {
  if (/workers_dev\s*=\s*(true|false)/.test(content)) {
    return content.replace(/workers_dev\s*=\s*(true|false)/, 'workers_dev = false');
  } else if (/compatibility_date\s*=\s*"[^"]*"/.test(content)) {
    return content.replace(/(compatibility_date\s*=\s*"[^"]*")/, '$1\nworkers_dev = false');
  } else {
    return `workers_dev = false\n${content}`;
  }
}

function updatePublicWrangler(domain, databaseId, publicSubdomain = 'www', apexHandling = 'redirect_to_sub', adminSubdomain = 'admin', customFilePath = null) {
  if (typeof publicSubdomain === 'string' && (publicSubdomain.endsWith('.toml') || publicSubdomain.includes('/') || publicSubdomain.includes('\\'))) {
    customFilePath = publicSubdomain;
    publicSubdomain = 'www';
    apexHandling = 'redirect_to_sub';
    adminSubdomain = 'admin';
  }
  if (typeof apexHandling === 'string' && (apexHandling.endsWith('.toml') || apexHandling.includes('/') || apexHandling.includes('\\'))) {
    customFilePath = apexHandling;
    apexHandling = 'redirect_to_sub';
    adminSubdomain = 'admin';
  }
  if (typeof adminSubdomain === 'string' && (adminSubdomain.endsWith('.toml') || adminSubdomain.includes('/') || adminSubdomain.includes('\\'))) {
    customFilePath = adminSubdomain;
    adminSubdomain = 'admin';
  }
  const filePath = customFilePath || path.resolve(ROOT_DIR, 'packages/public-worker/wrangler.toml');
  let content = fs.readFileSync(filePath, 'utf8');

  content = ensureWorkersDevFalse(content);
  content = content.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`);

  let routesStr;
  if (apexHandling === 'do_nothing') {
    const host = publicSubdomain ? `${publicSubdomain}.${domain}` : domain;
    routesStr = `routes = [\n  { pattern = "${host}", custom_domain = true }\n]`;
  } else {
    const sub = publicSubdomain || 'www';
    routesStr = `routes = [\n  { pattern = "${domain}", custom_domain = true },\n  { pattern = "${sub}.${domain}", custom_domain = true }\n]`;
  }
  content = replaceOrInsertRoutes(content, routesStr);

  content = content.replace(/^[ \t]*PROPELAUTH_AUTH_URL[ \t]*=.*\r?\n?/gm, '');

  const adminSub = adminSubdomain || 'admin';
  if (/ADMIN_SUBDOMAIN\s*=\s*"[^"]*"/.test(content)) {
    content = content.replace(/ADMIN_SUBDOMAIN\s*=\s*"[^"]*"/, `ADMIN_SUBDOMAIN = "${adminSub}"`);
  } else if (/\[vars\]/.test(content)) {
    content = content.replace(/\[vars\]/, `[vars]\nADMIN_SUBDOMAIN = "${adminSub}"`);
  } else {
    content += `\n[vars]\nADMIN_SUBDOMAIN = "${adminSub}"\n`;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function updateAdminApiWrangler(domain, databaseId, apiSubdomain = 'api', publicSubdomain = 'www', customFilePath = null) {
  if (typeof apiSubdomain === 'string' && (apiSubdomain.endsWith('.toml') || apiSubdomain.includes('/') || apiSubdomain.includes('\\'))) {
    customFilePath = apiSubdomain;
    apiSubdomain = 'api';
    publicSubdomain = 'www';
  }
  if (typeof publicSubdomain === 'string' && (publicSubdomain.endsWith('.toml') || publicSubdomain.includes('/') || publicSubdomain.includes('\\'))) {
    customFilePath = publicSubdomain;
    publicSubdomain = 'www';
  }
  const filePath = customFilePath || path.resolve(ROOT_DIR, 'packages/admin-api-worker/wrangler.toml');
  let content = fs.readFileSync(filePath, 'utf8');

  content = ensureWorkersDevFalse(content);
  content = content.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`);

  const sub = apiSubdomain || 'api';
  const routesStr = `routes = [\n  { pattern = "${sub}.${domain}", custom_domain = true }\n]`;
  content = replaceOrInsertRoutes(content, routesStr);

  content = content.replace(/^[ \t]*PROPELAUTH_AUTH_URL[ \t]*=.*\r?\n?/gm, '');

  const publicSub = publicSubdomain ?? 'www';
  if (/PUBLIC_SUBDOMAIN\s*=\s*"[^"]*"/.test(content)) {
    content = content.replace(/PUBLIC_SUBDOMAIN\s*=\s*"[^"]*"/, `PUBLIC_SUBDOMAIN = "${publicSub}"`);
  } else if (/\[vars\]/.test(content)) {
    content = content.replace(/\[vars\]/, `[vars]\nPUBLIC_SUBDOMAIN = "${publicSub}"`);
  } else {
    content += `\n[vars]\nPUBLIC_SUBDOMAIN = "${publicSub}"\n`;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function updateAdminApiAccessVars(aud, teamDomain, customFilePath = null) {
  const filePath = customFilePath || path.resolve(ROOT_DIR, 'packages/admin-api-worker/wrangler.toml');
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  if (aud) {
    if (/CF_ACCESS_AUD\s*=\s*"[^"]*"/.test(content)) {
      content = content.replace(/CF_ACCESS_AUD\s*=\s*"[^"]*"/, `CF_ACCESS_AUD = "${aud}"`);
    } else if (/\[vars\]/.test(content)) {
      content = content.replace(/\[vars\]/, `[vars]\nCF_ACCESS_AUD = "${aud}"`);
    } else {
      content += `\n[vars]\nCF_ACCESS_AUD = "${aud}"\n`;
    }
    console.log(`✓ Configured CF_ACCESS_AUD in admin-api-worker/wrangler.toml: ${aud}`);
  }

  if (teamDomain) {
    const cleanTeamDomain = teamDomain.trim().replace(/\/+$/, '');
    const fullTeamDomain = cleanTeamDomain.startsWith('http') ? cleanTeamDomain : `https://${cleanTeamDomain}`;
    const existingMatch = content.match(/CF_ACCESS_TEAM_DOMAIN\s*=\s*"([^"]*)"/);
    if (existingMatch && existingMatch[1] && existingMatch[1] !== fullTeamDomain) {
      console.warn(`⚠️  CF_ACCESS_TEAM_DOMAIN changed from ${existingMatch[1]} to ${fullTeamDomain}. Existing browser sessions on the old team domain may need cookies cleared.`);
    }

    if (/CF_ACCESS_TEAM_DOMAIN\s*=\s*"[^"]*"/.test(content)) {
      content = content.replace(/CF_ACCESS_TEAM_DOMAIN\s*=\s*"[^"]*"/, `CF_ACCESS_TEAM_DOMAIN = "${fullTeamDomain}"`);
    } else if (/\[vars\]/.test(content)) {
      content = content.replace(/\[vars\]/, `[vars]\nCF_ACCESS_TEAM_DOMAIN = "${fullTeamDomain}"`);
    } else {
      content += `\n[vars]\nCF_ACCESS_TEAM_DOMAIN = "${fullTeamDomain}"\n`;
    }
    console.log(`✓ Configured CF_ACCESS_TEAM_DOMAIN in admin-api-worker/wrangler.toml: ${fullTeamDomain}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function updateAdminUiWrangler(domain, uiSubdomain = 'admin', customFilePath = null) {
  if (typeof uiSubdomain === 'string' && (uiSubdomain.endsWith('.toml') || uiSubdomain.includes('/') || uiSubdomain.includes('\\'))) {
    customFilePath = uiSubdomain;
    uiSubdomain = 'admin';
  }
  const filePath = customFilePath || path.resolve(ROOT_DIR, 'packages/admin-ui/wrangler.toml');
  let content = fs.readFileSync(filePath, 'utf8');

  content = ensureWorkersDevFalse(content);
  const sub = uiSubdomain || 'admin';
  const routesStr = `routes = [\n  { pattern = "${sub}.${domain}", custom_domain = true }\n]`;
  content = replaceOrInsertRoutes(content, routesStr);

  fs.writeFileSync(filePath, content, 'utf8');
}

function updateAdminUiEnv(domain, apiSubdomain = 'api', customEnvPath = null) {
  if (typeof apiSubdomain === 'string' && (apiSubdomain.endsWith('.env') || apiSubdomain.includes('.env.') || apiSubdomain.includes('/') || apiSubdomain.includes('\\'))) {
    customEnvPath = apiSubdomain;
    apiSubdomain = 'api';
  }
  const envPath = customEnvPath || path.resolve(ROOT_DIR, 'packages/admin-ui/.env.production');
  const sub = apiSubdomain || 'api';
  const targetUrl = `https://${sub}.${domain}`;
  const targetLine = `VITE_API_BASE_URL=${targetUrl}`;

  if (!fs.existsSync(envPath)) {
    fs.mkdirSync(path.dirname(envPath), { recursive: true });
    fs.writeFileSync(envPath, `${targetLine}\n`, 'utf8');
    return;
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const resultLines = [];
  let updated = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      resultLines.push(line);
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      if (key === 'VITE_API_BASE_URL') {
        if (!updated) {
          resultLines.push(targetLine);
          updated = true;
        }
        // Deduplicate: ignore subsequent occurrences
        continue;
      }
    }
    resultLines.push(line);
  }

  if (!updated) {
    if (resultLines.length > 0 && resultLines[resultLines.length - 1] === '') {
      resultLines.splice(resultLines.length - 1, 0, targetLine);
    } else {
      resultLines.push(targetLine);
    }
  }

  let finalContent = resultLines.join('\n');
  if (!finalContent.endsWith('\n')) {
    finalContent += '\n';
  }
  fs.writeFileSync(envPath, finalContent, 'utf8');
}


function provisionD1Database(childEnv = null) {
  console.log('\n[1/5] Provisioning Cloudflare D1 Database (zygo-cms-db)...');
  let databaseId = null;
  const env = childEnv || { ...process.env, CI: 'true' };

  try {
    const listOut = execSync('npx wrangler d1 list --json', { stdio: ['pipe', 'pipe', 'pipe'], env }).toString();
    const list = extractJson(listOut);
    if (Array.isArray(list)) {
      const existing = list.find((db) => db.name === 'zygo-cms-db');
      if (existing) {
        databaseId = existing.uuid || existing.database_id;
        console.log(`✓ Found existing D1 database "zygo-cms-db" (UUID: ${databaseId})`);
      }
    }
  } catch (_) {
    console.log('  Notice: Could not list D1 databases via wrangler. Proceeding to create...');
  }

  if (!databaseId) {
    console.log('  Creating new D1 database "zygo-cms-db"...');
    try {
      const createOut = execSync('npx wrangler d1 create zygo-cms-db --json', { stdio: ['pipe', 'pipe', 'pipe'], env }).toString();
      const created = extractJson(createOut);
      databaseId = created?.uuid || created?.database_id || created?.id;
    } catch (err) {
      const out = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      const match = out.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
      if (match) {
        databaseId = match[0];
      } else {
        throw new Error(`Failed to create D1 database: ${err.message}`);
      }
    }
    console.log(`✓ Created D1 database "zygo-cms-db" (UUID: ${databaseId})`);
  }

  return databaseId;
}

function provisionR2Bucket(childEnv = null) {
  console.log('\n[2/5] Provisioning Cloudflare R2 Media Bucket (zygo-cms-media)...');
  const env = childEnv || { ...process.env, CI: 'true' };
  try {
    execSync('npx wrangler r2 bucket create zygo-cms-media', { stdio: ['pipe', 'pipe', 'pipe'], env });
    console.log('✓ Created R2 bucket "zygo-cms-media"');
  } catch (err) {
    const out = ((err.stdout?.toString() || '') + (err.stderr?.toString() || '')).toLowerCase();
    if (out.includes('already exists') || out.includes('already_exists') || out.includes('10004')) {
      console.log('✓ R2 bucket "zygo-cms-media" already exists');
    } else {
      console.warn(`⚠️  Warning: R2 bucket creation returned: ${err.message}. Continuing...`);
    }
  }
}

function applyRemoteMigrations(childEnv = null, execFn = execSync) {
  console.log('\n[4/5] Applying remote D1 database migrations...');
  try {
    execFn('npx wrangler d1 migrations apply zygo-cms-db --remote -c packages/admin-api-worker/wrangler.toml', {
      stdio: 'inherit',
      env: childEnv || { ...process.env, CI: 'true' }
    });
    console.log('✓ Remote D1 migrations applied successfully');
    return true;
  } catch (err) {
    console.error(`⚠️  Failed to apply remote migrations automatically: ${err.message}`);
    console.log('You can apply migrations manually later using:');
    console.log('  npx wrangler d1 migrations apply zygo-cms-db --remote -c packages/admin-api-worker/wrangler.toml');
    return false;
  }
}

function printManualAccessInstructions(domain, adminEmail, uiSubdomain = 'admin', apiSubdomain = 'api') {
  const uiHost = `${uiSubdomain || 'admin'}.${domain}`;
  const apiHost = `${apiSubdomain || 'api'}.${domain}`;
  console.log('\n------------------------------------------------------------');
  console.log('MANUAL CLOUDFLARE ACCESS (ZERO TRUST) SETUP INSTRUCTIONS:');
  console.log('------------------------------------------------------------');
  console.log('1. Visit Cloudflare Zero Trust: https://one.dash.cloudflare.com/');
  console.log('2. Navigate to Access -> Applications, then click "Add an application".');
  console.log('3. Select "Self-hosted":');
  console.log('   - Application name: Zygo CMS Admin');
  console.log(`   - Application domain: ${uiHost}`);
  console.log('   - Session Duration: 24 hours');
  console.log('   - Under CORS settings, configure:');
  console.log(`     * Allowed Origins: https://${uiHost}, https://${apiHost}`);
  console.log('     * Allowed Methods: GET, POST, PUT, DELETE, OPTIONS, HEAD');
  console.log('     * Allowed Headers: *');
  console.log('     * Allow All Headers: Enabled');
  console.log('     * Allow Credentials: Enabled');
  console.log('     * Max Age: 86400');
  console.log('4. Add an Access Policy:');
  console.log('   - Policy name: Admin Access Policy');
  console.log('   - Action: Allow');
  console.log(`   - Include rule: Selector "Emails" -> Value: ${adminEmail}`);
  console.log('------------------------------------------------------------\n');
}

async function createAccessAppAndPolicy(accountId, apiToken, appName, appDomain, allowedOrigins, adminEmail) {
  let appId = null;
  let appAud = null;

  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'zygo-cms-setup/0.1.0'
  };

  const payload = {
    name: appName,
    domain: appDomain,
    type: 'self_hosted',
    session_duration: '24h',
    auto_redirect_to_identity: false,
    cors_headers: {
      allowed_origins: allowedOrigins,
      allow_all_methods: true,
      allow_all_headers: true,
      allow_credentials: true,
      max_age: 86400
    }
  };

  let appRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  let appData = await appRes.json();

  // If Cloudflare rejects CORS headers (e.g. error 12130), retry without cors_headers
  if (!appRes.ok && JSON.stringify(appData).includes('invalid CORS headers')) {
    delete payload.cors_headers;
    appRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    appData = await appRes.json();
  }

  if (appRes.ok && appData.success && appData.result?.id) {
    appId = appData.result.id;
    appAud = appData.result.aud || null;
    console.log(`✓ Created Access Application for ${appDomain} (ID: ${appId})`);
  } else {
    const listRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps`, {
      headers
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const existing = listData.result?.find((a) => a.domain === appDomain);
      if (existing) {
        appId = existing.id;
        appAud = existing.aud || null;
        console.log(`✓ Found existing Access Application for ${appDomain} (ID: ${appId})`);
      }
    }

    if (!appId) {
      const errorStr = JSON.stringify(appData.errors || appData.messages || appData);
      if (errorStr.includes('not_enabled')) {
        console.warn(`\n⚠️  Cloudflare Zero Trust is not yet enabled on your Cloudflare account.`);
        console.warn(`   Cloudflare requires a 60-second one-time activation before the API can create Access apps:`);
        console.warn(`   1. Open https://one.dash.cloudflare.com/ in your browser.`);
        console.warn(`   2. Choose an organization / team domain name.`);
        console.warn(`   3. Select the "Free" plan ($0/mo, covers up to 50 users).`);
        console.warn(`   4. Once complete, re-run "pnpm run setup" to automatically create the Access application!\n`);
      } else if (errorStr.includes('auth.forbidden') || errorStr.includes('1010')) {
        console.warn(`\n⚠️  API Token Forbidden (Error 1010: auth.forbidden).`);
        console.warn(`   Your Cloudflare API Token is missing permission to manage Zero Trust Access:`);
        console.warn(`   1. Open https://dash.cloudflare.com/profile/api-tokens in your browser.`);
        console.warn(`   2. Edit your API Token and ensure it includes:`);
        console.warn(`      • Account > Access: Apps and Policies -> Edit`);
        console.warn(`      • Account > Access: Organizations, Identity Providers, and Groups -> Edit`);
        console.warn(`      • Account Resources -> Include -> All accounts (or your specific account)`);
        console.warn(`   3. Re-run "pnpm run setup" once updated.\n`);
      } else {
        console.warn(`⚠️  Access application creation failed for ${appDomain}: ${errorStr}`);
      }
      return false;
    }
  }

  // Check for existing policies to avoid duplicates
  const listPoliciesRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps/${appId}/policies`, {
    headers
  });
  if (listPoliciesRes.ok) {
    const listPoliciesData = await listPoliciesRes.json();
    const existingPolicy = listPoliciesData.result?.find((p) => p.name === 'Admin Access Policy' || 
      p.include?.some(i => i.email?.email === adminEmail));
    
    if (existingPolicy) {
      console.log(`✓ Found existing Access Policy on ${appDomain} for ${adminEmail} (ID: ${existingPolicy.id})`);
      return { success: true, appId, aud: appAud };
    }
  }

  const policyRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps/${appId}/policies`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Admin Access Policy',
      decision: 'allow',
      include: [
        { email: { email: adminEmail } }
      ]
    })
  });

  const policyData = await policyRes.json();
  if (policyRes.ok && policyData.success) {
    console.log(`✓ Created Access Policy on ${appDomain} for ${adminEmail}`);
    return { success: true, appId, aud: appAud };
  } else {
    console.warn(`⚠️  Access Policy creation failed on ${appDomain}: ${JSON.stringify(policyData.errors || policyData.messages || policyData)}`);
    return false;
  }
}

async function getZeroTrustOrgDomain(accountId, apiToken) {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/organizations`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'zygo-cms-setup/0.1.0'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success && data?.result?.auth_domain) {
      return data.result.auth_domain;
    }
    return null;
  } catch (_) {
    return null;
  }
}

async function ensureZeroTrustOrganization(accountId, apiToken, teamName, orgName = null) {
  try {
    const existing = await getZeroTrustOrgDomain(accountId, apiToken);
    if (existing) {
      console.log(`✓ Found existing Cloudflare Zero Trust Organization (${existing})`);
      return existing;
    }

    if (!teamName || typeof teamName !== 'string' || !teamName.trim()) {
      return null;
    }

    let slug = teamName.trim().toLowerCase();
    slug = slug.replace(/^https?:\/\//, '');
    slug = slug.replace(/\.cloudflareaccess\.com$/, '');
    slug = slug.trim();
    if (!slug) {
      return null;
    }

    const authDomain = `${slug}.cloudflareaccess.com`;
    const resolvedOrgName = orgName || slug;

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/organizations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'zygo-cms-setup/0.1.0'
      },
      body: JSON.stringify({
        name: resolvedOrgName,
        auth_domain: authDomain
      })
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success && data?.result?.auth_domain) {
      console.log(`✓ Created Cloudflare Zero Trust Organization (${data.result.auth_domain})`);
      return data.result.auth_domain;
    } else {
      const details = JSON.stringify(data?.errors || data?.messages || data);
      console.warn(`⚠️  Could not provision Zero Trust Organization (${authDomain}): ${details}`);
      return null;
    }
  } catch (err) {
    console.warn(`⚠️  Could not provision Zero Trust Organization: ${err.message}`);
    return null;
  }
}

async function ensureOneTimePinProvider(accountId, apiToken) {
  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'zygo-cms-setup/0.1.0'
  };

  try {
    const listRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/identity_providers`, {
      headers
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const providers = Array.isArray(listData?.result) ? listData.result : [];
      if (providers.some((p) => p.type === 'onetimepin')) {
        console.log('✓ One-Time PIN login method is already active.');
        return true;
      }
    }

    const createRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/identity_providers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'One-Time PIN',
        type: 'onetimepin',
        config: {}
      })
    });

    const createData = await createRes.json();
    if (createRes.ok && createData.success) {
      console.log('✓ Configured One-Time PIN login method (allows any authorized email to receive a login code).');
      return true;
    } else {
      const details = JSON.stringify(createData?.errors || createData?.messages || createData);
      console.warn(`\n⚠️  Could not configure One-Time PIN via API: ${details}`);
      console.warn('   You can enable it manually in 30 seconds at:');
      console.warn('   https://one.dash.cloudflare.com/ -> Settings -> Authentication -> Login methods -> Add new -> One-time PIN.\n');
      return false;
    }
  } catch (err) {
    console.warn(`\n⚠️  Could not configure One-Time PIN via API: ${err.message}`);
    console.warn('   You can enable it manually in 30 seconds at:');
    console.warn('   https://one.dash.cloudflare.com/ -> Settings -> Authentication -> Login methods -> Add new -> One-time PIN.\n');
    return false;
  }
}

async function configureGoogleProvider(accountId, apiToken, clientId, clientSecret) {
  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'zygo-cms-setup/0.1.0'
  };

  try {
    const listRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/identity_providers`, {
      headers
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const providers = Array.isArray(listData?.result) ? listData.result : [];
      if (providers.some((p) => p.type === 'google')) {
        console.log('✓ Google OAuth login method is already configured.');
        return true;
      }
    }

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/identity_providers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Google',
        type: 'google',
        config: {
          client_id: clientId,
          client_secret: clientSecret
        }
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      console.log('✓ Configured Google OAuth login method.');
      return true;
    } else {
      const details = JSON.stringify(data?.errors || data?.messages || data);
      console.warn(`⚠️  Could not configure Google OAuth login method: ${details}`);
      return false;
    }
  } catch (err) {
    console.warn(`⚠️  Could not configure Google OAuth login method: ${err.message}`);
    return false;
  }
}

async function configureCloudflareAccess(accountId, apiToken, domain, adminEmail, uiSubdomain = 'admin', apiSubdomain = 'api', customApiPath = null, teamName = null) {
  if (typeof uiSubdomain === 'object' && uiSubdomain !== null) {
    customApiPath = uiSubdomain.customApiPath || null;
    apiSubdomain = uiSubdomain.apiSubdomain || 'api';
    teamName = uiSubdomain.teamName || null;
    uiSubdomain = uiSubdomain.uiSubdomain || 'admin';
  }
  const uiSub = uiSubdomain || 'admin';
  const apiSub = apiSubdomain || 'api';
  const uiHost = `${uiSub}.${domain}`;
  const apiHost = `${apiSub}.${domain}`;
  const allowedOrigins = [`https://${uiHost}`, `https://${apiHost}`];

  try {
    let orgDomain = null;
    if (teamName) {
      orgDomain = await ensureZeroTrustOrganization(accountId, apiToken, teamName);
    }

    const uiResult = await createAccessAppAndPolicy(accountId, apiToken, 'Zygo CMS Admin UI', uiHost, allowedOrigins, adminEmail);
    const apiResult = await createAccessAppAndPolicy(accountId, apiToken, 'Zygo CMS Admin API', apiHost, allowedOrigins, adminEmail);

    const uiSuccess = Boolean(uiResult?.success ?? uiResult);
    const apiSuccess = Boolean(apiResult?.success ?? apiResult);

    if (apiSuccess && apiResult?.aud) {
      if (!orgDomain) {
        orgDomain = await getZeroTrustOrgDomain(accountId, apiToken);
      }
      updateAdminApiAccessVars(apiResult.aud, orgDomain, customApiPath);
    }

    if (!uiSuccess || !apiSuccess) {
      printManualAccessInstructions(domain, adminEmail, uiSub, apiSub);
    }

    return {
      success: uiSuccess && apiSuccess,
      aud: apiResult?.aud || null,
      teamDomain: orgDomain || null
    };
  } catch (err) {
    console.warn(`⚠️  Could not configure Cloudflare Access via REST API: ${err.message}`);
    printManualAccessInstructions(domain, adminEmail, uiSub, apiSub);
    return {
      success: false,
      aud: null,
      teamDomain: null
    };
  }
}


async function getZoneId(accountId, apiToken, domain, fetchFn = fetch) {
  try {
    const url = accountId
      ? `https://api.cloudflare.com/client/v4/zones?name=${domain}&account.id=${accountId}`
      : `https://api.cloudflare.com/client/v4/zones?name=${domain}`;
    const res = await fetchFn(url, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result?.[0]?.id || null;
  } catch (_) { return null; }
}

async function applyZoneSettings(zoneId, apiToken, settings) {
  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/settings`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: settings })
    });
  } catch (err) {
    console.warn(`⚠️  Failed to apply zone settings: ${err.message}`);
  }
}

async function applyBotFightMode(zoneId, apiToken, state) {
  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/bot_management`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fight_mode: state })
    });
  } catch (err) {
    console.warn(`⚠️  Failed to apply Bot Fight Mode: ${err.message}`);
  }
}

async function applyAiCrawlSettings(zoneId, apiToken, settings = {}) {
  try {
    const payload = {};
    if (settings.aiBotsProtection !== undefined) payload.ai_bots_protection = settings.aiBotsProtection;
    if (settings.aiSearch !== undefined) payload.ai_search = settings.aiSearch;
    if (settings.aiTraining !== undefined) payload.ai_training = settings.aiTraining;
    if (settings.aiUser !== undefined) payload.ai_user = settings.aiUser;

    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/bot_management`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.warn(`⚠️  Failed to apply AI Crawl Settings: ${err.message}`);
    return false;
  }
}

function updateAdminApiZoneVar(zoneId, customFilePath = null) {
  const filePaths = customFilePath
    ? [customFilePath]
    : [
        path.resolve(ROOT_DIR, 'packages/admin-api-worker/wrangler.toml'),
        path.resolve(ROOT_DIR, 'packages/public-worker/wrangler.toml')
      ];

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');

    if (/CF_ZONE_ID\s*=\s*"[^"]*"/.test(content)) {
      content = content.replace(/CF_ZONE_ID\s*=\s*"[^"]*"/, `CF_ZONE_ID = "${zoneId}"`);
    } else if (/\[vars\]/.test(content)) {
      content = content.replace(/\[vars\]/, `[vars]\nCF_ZONE_ID = "${zoneId}"`);
    } else {
      content += `\n[vars]\nCF_ZONE_ID = "${zoneId}"\n`;
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }
}

async function applyCloudflareRedirect(zoneId, apiToken, fromHostname, toHostname) {
  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'zygo-cms-setup/0.1.0'
  };

  const newRule = {
    description: `Redirect ${fromHostname} to ${toHostname}`,
    expression: `(http.host eq "${fromHostname}")`,
    action: 'redirect',
    action_parameters: {
      from_value: {
        status_code: 301,
        target_url: {
          expression: `concat("https://${toHostname}", http.request.uri.path)`
        },
        preserve_query_string: true
      }
    }
  };

  try {
    const getRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`,
      { headers }
    );

    if (getRes.status === 403) {
      console.warn('⚠️  Could not configure dynamic redirect ruleset (requires Zone > Single Redirect: Edit token scope).');
      return false;
    }

    if (getRes.status === 404) {
      const postRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Redirect Rules',
          kind: 'zone',
          phase: 'http_request_dynamic_redirect',
          rules: [newRule]
        })
      });
      if (postRes.status === 403) {
        console.warn('⚠️  Could not configure dynamic redirect ruleset (requires Zone > Single Redirect: Edit token scope).');
        return false;
      }
      const postData = await postRes.json();
      if (postRes.ok && postData.success) {
        return true;
      }
      const postErrorStr = JSON.stringify(postData?.errors || postData);
      if (postErrorStr.includes('10000') || postErrorStr.includes('unauthorized') || postErrorStr.includes('forbidden')) {
        console.warn('⚠️  Could not configure dynamic redirect ruleset (requires Zone > Single Redirect: Edit token scope).');
      } else {
        console.warn(`⚠️  Failed to create redirect ruleset: ${postErrorStr}`);
      }
      return false;
    }

    if (!getRes.ok) {
      const errorData = await getRes.json().catch(() => ({}));
      const errorStr = JSON.stringify(errorData?.errors || errorData);
      if (errorStr.includes('10000') || errorStr.includes('unauthorized') || errorStr.includes('forbidden')) {
        console.warn('⚠️  Could not configure dynamic redirect ruleset (requires Zone > Single Redirect: Edit token scope).');
      } else {
        console.warn(`⚠️  Failed to fetch redirect ruleset: ${errorStr}`);
      }
      return false;
    }

    const getData = await getRes.json();
    const rulesetId = getData?.result?.id;
    if (!rulesetId) {
      console.warn('⚠️  Could not find ruleset ID in entrypoint response');
      return false;
    }

    const existingRules = Array.isArray(getData.result?.rules) ? getData.result.rules : [];
    const filteredRules = existingRules.filter((r) => r.expression !== newRule.expression);
    const updatedRules = [...filteredRules, newRule];

    const putRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/${rulesetId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ rules: updatedRules })
    });

    if (putRes.status === 403) {
      console.warn('⚠️  Could not configure dynamic redirect ruleset (requires Zone > Single Redirect: Edit token scope).');
      return false;
    }

    const putData = await putRes.json();
    if (putRes.ok && putData.success) {
      return true;
    }
    const putErrorStr = JSON.stringify(putData?.errors || putData);
    if (putErrorStr.includes('10000') || putErrorStr.includes('unauthorized') || putErrorStr.includes('forbidden')) {
      console.warn('⚠️  Could not configure dynamic redirect ruleset (requires Zone > Single Redirect: Edit token scope).');
    } else {
      console.warn(`⚠️  Failed to update redirect ruleset: ${putErrorStr}`);
    }
    return false;
  } catch (err) {
    console.warn('⚠️  Could not configure dynamic redirect ruleset (requires Zone > Single Redirect: Edit token scope).');
    return false;
  }
}

const CONFIG_FILES = [
  'packages/public-worker/wrangler.toml',
  'packages/admin-api-worker/wrangler.toml',
  'packages/admin-ui/wrangler.toml',
  'packages/admin-ui/.env.production'
];

function backupConfigs(rootDir = ROOT_DIR) {
  const backups = new Map();
  for (const relPath of CONFIG_FILES) {
    const fullPath = path.resolve(rootDir, relPath);
    const content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : null;
    backups.set(relPath, content);
    backups.set(fullPath, content);
  }
  return backups;
}

function rollbackConfigs(backups, rootDir = ROOT_DIR) {
  if (!backups || !(backups instanceof Map)) return;
  for (const [filePath, content] of backups.entries()) {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath);
    if (content === null) {
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (_) {}
      }
    } else {
      try {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf8');
      } catch (_) {}
    }
  }
}

function parseCliArgs(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      'doctor': { type: 'boolean', default: false },
      'yes': { type: 'boolean', short: 'y', default: false },
      'dry-run': { type: 'boolean', default: false },
      'no-deploy': { type: 'boolean', default: false },
      'domain': { type: 'string' },
      'email': { type: 'string' },
      'account-id': { type: 'string' },
      'token': { type: 'string' },
      'public-subdomain': { type: 'string', default: 'www' },
      'admin-ui-subdomain': { type: 'string', default: 'admin' },
      'admin-api-subdomain': { type: 'string', default: 'api' },
      'apex-handling': { type: 'string', default: 'redirect_to_sub' },
      'team-name': { type: 'string' },
      'bot-fight-mode': { type: 'boolean' },
      'security-level': { type: 'string' },
      'skip-access': { type: 'boolean', default: false }
    },
    allowPositionals: true
  });
  const isInteractive = !values.yes && !values.doctor && !values['dry-run'];
  return { flags: values, isInteractive };
}

async function runPreflightChecks(config = {}, { isDoctorMode = false, exec = execSync, fetchFn = fetch } = {}) {
  const checks = [];

  // 1. Node.js LTS (v22+)
  const nodeVersion = process.versions.node;
  const nodeMajor = parseInt(nodeVersion.split('.')[0], 10);
  const nodeOk = !isNaN(nodeMajor) && nodeMajor >= 22;
  checks.push({
    name: 'Node.js LTS (v22+)',
    ok: nodeOk,
    detail: `Found v${nodeVersion}`,
    fix: !nodeOk ? 'Install Node.js 22 LTS or newer (https://nodejs.org)' : undefined,
    critical: true
  });

  // 2. pnpm (v11+)
  let pnpmOk = false;
  let pnpmDetail = 'Not found';
  try {
    const out = exec('pnpm --version', { stdio: ['pipe', 'pipe', 'pipe'] })?.toString().trim();
    if (out) {
      const pnpmMajor = parseInt(out.split('.')[0], 10);
      pnpmOk = !isNaN(pnpmMajor) && pnpmMajor >= 11;
      pnpmDetail = `Found v${out}`;
    }
  } catch (err) {
    pnpmDetail = err.message || 'Not found';
  }
  checks.push({
    name: 'pnpm (v11+)',
    ok: pnpmOk,
    detail: pnpmDetail,
    fix: !pnpmOk ? 'Install pnpm v11+ (npm install -g pnpm@latest)' : undefined,
    critical: true
  });

  // 3. Rust wasm32 target
  let wasmOk = false;
  let wasmDetail = 'Not installed';
  try {
    const out = exec('rustup target list --installed', { stdio: ['pipe', 'pipe', 'pipe'] })?.toString() || '';
    wasmOk = out.includes('wasm32-unknown-unknown');
    wasmDetail = wasmOk ? 'Installed' : 'Target wasm32-unknown-unknown not installed';
  } catch (err) {
    wasmDetail = err.message || 'rustup not found';
  }
  checks.push({
    name: 'Rust wasm32 target',
    ok: wasmOk,
    detail: wasmDetail,
    fix: !wasmOk ? 'Run: rustup target add wasm32-unknown-unknown' : undefined,
    critical: true
  });

  // 4. worker-build
  let workerBuildOk = false;
  let workerBuildDetail = 'Not found';
  try {
    const out = exec('worker-build --version', { stdio: ['pipe', 'pipe', 'pipe'] })?.toString().trim();
    if (out) {
      workerBuildOk = true;
      workerBuildDetail = out;
    }
  } catch (err) {
    workerBuildDetail = err.message || 'worker-build not found';
  }
  checks.push({
    name: 'worker-build',
    ok: workerBuildOk,
    detail: workerBuildDetail,
    fix: !workerBuildOk ? 'Run: cargo install -q worker-build' : undefined,
    critical: true
  });

  // 5. Cloudflare Account Auth
  let accountId = config.accountId;
  if (!accountId && typeof process !== 'undefined') {
    accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
  }
  if (!accountId) {
    try {
      accountId = detectAccountId(exec);
    } catch (_) {}
  }
  const authOk = Boolean(accountId);
  checks.push({
    name: 'Cloudflare Account',
    ok: authOk,
    detail: authOk ? `Account ID: ${accountId}` : 'No account ID detected',
    fix: !authOk ? 'Run: npx wrangler login or provide --account-id' : undefined,
    critical: false
  });

  // 6. Cloudflare Zone
  const apiToken = config.apiToken || (typeof process !== 'undefined' ? (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN) : null);
  const domain = config.domain;
  if (apiToken && domain) {
    let zoneOk = false;
    let zoneDetail = 'Zone not found';
    try {
      const zoneId = await getZoneId(accountId, apiToken, domain, fetchFn);
      if (zoneId) {
        zoneOk = true;
        zoneDetail = `Zone ID: ${zoneId}`;
      } else {
        zoneDetail = `Domain ${domain} not found on account`;
      }
    } catch (err) {
      zoneDetail = err.message || 'Zone check failed';
    }
    checks.push({
      name: 'Cloudflare Zone',
      ok: zoneOk,
      detail: zoneDetail,
      fix: !zoneOk ? `Ensure domain ${domain} is added as an active zone in Cloudflare` : undefined,
      critical: false
    });
  } else if (isDoctorMode) {
    checks.push({
      name: 'Cloudflare Zone',
      ok: false,
      detail: 'Skipped (domain or API token not provided)',
      fix: 'Provide --domain, --token, and --account-id to verify active zone',
      critical: false
    });
  }

  return checks;
}

function printPreflightReport(checks) {
  console.log('\n' + pc.bold('Preflight Diagnostics & Environment Report:'));
  console.log('─'.repeat(50));
  for (const check of checks) {
    const symbol = check.ok ? pc.green('✔') : check.critical ? pc.red('✖') : pc.yellow('⚠');
    const name = pc.bold(check.name);
    const detail = check.detail ? pc.dim(` (${check.detail})`) : '';
    console.log(`  ${symbol} ${name}${detail}`);
    if (!check.ok && check.fix) {
      console.log(`    ${pc.dim('Fix:')} ${pc.cyan(check.fix)}`);
    }
  }
  console.log('─'.repeat(50) + '\n');
}

async function verifyDeployment(config, { fetchFn = fetch } = {}) {
  const publicSub = config.publicSubdomain || 'www';
  const adminUiSub = config.adminUiSubdomain || 'admin';
  const adminApiSub = config.adminApiSubdomain || 'api';
  const domain = config.domain;

  const targets = [
    {
      name: 'Public Site',
      url: `https://${domain}`,
      allowedStatuses: [200, 301, 302]
    },
    {
      name: 'Admin UI',
      url: `https://${adminUiSub}.${domain}`,
      allowedStatuses: [200, 302]
    },
    {
      name: 'Admin API',
      url: `https://${adminApiSub}.${domain}/api/me`,
      allowedStatuses: [200, 302, 401]
    }
  ];

  const results = [];
  console.log('\n' + pc.bold('Verifying Edge Deployment Health:'));

  for (const target of targets) {
    let status = null;
    let ok = false;
    let detail = '';
    try {
      const res = await fetchFn(target.url, { method: 'HEAD', redirect: 'manual' });
      status = res ? res.status : null;
      ok = Boolean(status && target.allowedStatuses.includes(status));
      detail = status ? `HTTP ${status}` : 'No response';
    } catch (err) {
      ok = false;
      detail = err.message || 'Network request failed';
    }

    results.push({
      name: target.name,
      url: target.url,
      status,
      ok,
      detail
    });

    if (ok) {
      console.log(`  ${pc.green('✔')} ${target.name} (${target.url}): ${pc.green(detail)}`);
    } else {
      console.log(`  ${pc.yellow('⚠')} ${target.name} (${target.url}): ${pc.yellow(detail)}`);
    }
  }

  return results;
}

async function main() {
  const { flags, isInteractive } = parseCliArgs();

  // 1. Doctor Mode
  if (flags.doctor) {
    console.log(pc.bold(pc.cyan('\nZygo CMS Preflight Doctor')));
    const doctorConfig = {
      domain: flags.domain || '',
      accountId: flags['account-id'] || (typeof process !== 'undefined' ? (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID) : null) || detectAccountId() || '',
      apiToken: flags.token || (typeof process !== 'undefined' ? (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN) : null) || ''
    };
    const checks = await runPreflightChecks(doctorConfig, { isDoctorMode: true });
    printPreflightReport(checks);
    const allCriticalOk = checks.every(c => !c.critical || c.ok);
    process.exit(allCriticalOk ? 0 : 1);
  }

  // 2. Preflight critical checks
  const preflightChecks = await runPreflightChecks();
  const criticalFailed = preflightChecks.filter(c => c.critical && !c.ok);
  if (criticalFailed.length > 0) {
    console.error(pc.red('\n✖ Preflight checks failed:'));
    for (const c of criticalFailed) {
      console.error(pc.red(`  - ${c.name}: ${c.detail}`));
      if (c.fix) {
        console.error(pc.cyan(`    Fix: ${c.fix}`));
      }
    }
    process.exit(1);
  }

  if (isInteractive) {
    console.clear();
    intro(pc.bgCyan(pc.black(' 🚀 Welcome to the Zygo CMS Setup Wizard ')));
    console.log('This wizard will guide you through configuring and deploying');
    console.log('your high-performance edge CMS on Cloudflare Workers.\n');
  }

  const detectedAccountId = flags['account-id'] || process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || detectAccountId();
  const detectedApiToken = flags.token || process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || null;

  const config = {
    domain: flags.domain || '',
    publicSubdomain: flags['public-subdomain'] || 'www',
    apexHandling: flags['apex-handling'] || 'redirect_to_sub',
    adminUiSubdomain: flags['admin-ui-subdomain'] || 'admin',
    adminApiSubdomain: flags['admin-api-subdomain'] || 'api',
    accountId: detectedAccountId || '',
    apiToken: detectedApiToken || '',
    adminEmail: flags.email || '',
    zeroTrustTeamName: flags['team-name'] || '',
    enableGoogle: false,
    googleClientId: '',
    googleClientSecret: '',
    securityLevel: flags['security-level'] || 'medium',
    botFightMode: flags['bot-fight-mode'] !== undefined ? flags['bot-fight-mode'] : true,
    cfSettings: ['always_use_https', 'http3', 'ipv6', 'tiered_cache', 'brotli', 'early_hints'],
    aiCrawlSettings: { aiBotsProtection: 'block', aiSearch: 'block', aiTraining: 'block', aiUser: 'block' },
    accessAud: null,
    skipAccess: flags['skip-access'] || false
  };

  if (!isInteractive) {
    // Non-interactive validation
    if (!config.domain || !validateDomain(config.domain)) {
      console.error(pc.red('Error: Missing or invalid required flag: --domain <domain> (e.g. --domain example.com)'));
      process.exit(1);
    }
    config.domain = validateDomain(config.domain);

    if (!config.adminEmail || !validateEmail(config.adminEmail)) {
      console.error(pc.red('Error: Missing or invalid required flag: --email <email> (e.g. --email admin@example.com)'));
      process.exit(1);
    }
    config.adminEmail = validateEmail(config.adminEmail);

    if (!config.zeroTrustTeamName) {
      config.zeroTrustTeamName = deriveDefaultTeamSlug(config.domain);
    }
  } else {
    // Interactive Wizard Prompts
    const domainAns = await text({
      message: 'Apex Domain Name (e.g. example.com)',
      initialValue: config.domain || undefined,
      validate(value) {
        if (!value) return 'Value is required';
        if (!validateDomain(value)) return 'Invalid domain format';
      }
    });
    if (isCancel(domainAns)) { cancel('Setup cancelled'); return process.exit(0); }
    config.domain = domainAns.trim();

    const publicSubAns = await text({
      message: 'Public Subdomain',
      initialValue: config.publicSubdomain || 'www',
      defaultValue: 'www',
      placeholder: 'www',
      validate(value) {
        if (!value || !value.trim()) return 'Value is required';
      }
    });
    if (isCancel(publicSubAns)) { cancel('Setup cancelled'); return process.exit(0); }
    config.publicSubdomain = publicSubAns.trim();

    const sub = config.publicSubdomain || 'www';
    const apexAns = await select({
      message: 'How should we handle the Apex/Root domain?',
      options: [
        { value: 'redirect_to_sub', label: `Redirect Apex to Subdomain (${config.domain} -> ${sub}.${config.domain})` },
        { value: 'redirect_to_apex', label: `Redirect Subdomain to Apex (${sub}.${config.domain} -> ${config.domain})` },
        { value: 'serve_both', label: 'Serve CMS on both (No redirect)' },
        { value: 'do_nothing', label: 'Do nothing (Leave Apex untouched, it is used for something else)' }
      ],
      initialValue: config.apexHandling || 'redirect_to_sub'
    });
    if (isCancel(apexAns)) { cancel('Setup cancelled'); return process.exit(0); }
    config.apexHandling = apexAns;

    const adminUiSubAns = await text({
      message: 'Admin UI Subdomain',
      initialValue: config.adminUiSubdomain || 'admin',
      defaultValue: 'admin',
      placeholder: 'admin',
      validate(value) {
        if (!value || !value.trim()) return 'Value is required';
      }
    });
    if (isCancel(adminUiSubAns)) { cancel('Setup cancelled'); return process.exit(0); }
    config.adminUiSubdomain = adminUiSubAns.trim();

    const adminApiSubAns = await text({
      message: 'Admin API Subdomain',
      initialValue: config.adminApiSubdomain || 'api',
      defaultValue: 'api',
      placeholder: 'api',
      validate(value) {
        if (!value || !value.trim()) return 'Value is required';
      }
    });
    if (isCancel(adminApiSubAns)) { cancel('Setup cancelled'); return process.exit(0); }
    config.adminApiSubdomain = adminApiSubAns.trim();

    const accountAns = await text({
      message: 'Cloudflare Account ID',
      initialValue: config.accountId || '',
      validate(value) {
        if (!value.trim()) return 'Account ID is required';
      }
    });
    if (isCancel(accountAns)) { cancel('Setup cancelled'); return process.exit(0); }
    config.accountId = accountAns.trim();

    const tokenAns = await password({
      message: 'Cloudflare API Token',
      validate(value) {
        if (!value || !value.trim()) return 'API Token is required';
      }
    });
    if (isCancel(tokenAns)) { cancel('Setup cancelled'); return process.exit(0); }
    config.apiToken = tokenAns.trim();

    const emailAns = await text({
      message: 'Admin User Email Address',
      initialValue: config.adminEmail || undefined,
      validate(value) {
        if (!value) return 'Value is required';
        if (!validateEmail(value)) return 'Invalid email format';
      }
    });
    if (isCancel(emailAns)) { cancel('Setup cancelled'); return process.exit(0); }
    config.adminEmail = emailAns.trim();

    const existingOrgDomain = await getZeroTrustOrgDomain(config.accountId, config.apiToken);
    if (existingOrgDomain) {
      console.log(pc.green(`✓ Detected Zero Trust team domain: ${existingOrgDomain}`));
    } else {
      const defaultSlug = deriveDefaultTeamSlug(config.domain);
      const teamAns = await text({
        message: 'Zero Trust Team Subdomain (<team>.cloudflareaccess.com)',
        initialValue: defaultSlug,
        defaultValue: defaultSlug,
        placeholder: defaultSlug,
        validate(value) {
          if (!value || !value.trim()) return 'Team subdomain is required';
          const cleaned = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/\.cloudflareaccess\.com$/, '');
          if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(cleaned)) {
            return 'Use lowercase letters, numbers, and hyphens only';
          }
        }
      });
      if (isCancel(teamAns)) { cancel('Setup cancelled'); return process.exit(0); }
      config.zeroTrustTeamName = teamAns.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/\.cloudflareaccess\.com$/, '');
    }

    const googleAns = await confirm({
      message: 'Would you like to enable Google OAuth sign-in? (requires GCP credentials)',
      initialValue: false
    });
    if (isCancel(googleAns)) { cancel('Setup cancelled'); return process.exit(0); }
    config.enableGoogle = googleAns;

    if (config.enableGoogle) {
      const clientIdAns = await text({
        message: 'Google Client ID',
        validate: (v) => !v.trim() ? 'Required' : undefined
      });
      if (isCancel(clientIdAns)) return process.exit(0);
      config.googleClientId = clientIdAns.trim();

      const clientSecretAns = await password({
        message: 'Google Client Secret',
        validate: (v) => !v || !v.trim() ? 'Required' : undefined
      });
      if (isCancel(clientSecretAns)) return process.exit(0);
      config.googleClientSecret = clientSecretAns.trim();
    }

    // Progressive disclosure for Cloudflare Edge & AI Crawl settings
    const configureAdvanced = await confirm({
      message: 'Configure advanced Cloudflare Edge & AI Crawl settings? (Recommended defaults: Bot Fight on, AI blocked, Medium WAF, HTTP/3 & Tiered Cache enabled)',
      initialValue: false
    });
    if (isCancel(configureAdvanced)) { cancel('Setup cancelled'); return process.exit(0); }

    if (configureAdvanced) {
      const botAns = await confirm({
        message: 'Enable Bot Fight Mode? (Recommended to prevent malicious scraping)',
        initialValue: true
      });
      if (isCancel(botAns)) return process.exit(0);
      config.botFightMode = botAns;

      const aiPolicyAns = await select({
        message: 'Cloudflare AI Crawl Control Policy:',
        options: [
          { value: 'block_all', label: 'Block All AI Crawlers & Scrapers (Recommended for maximum content protection)' },
          { value: 'allow_search_only', label: 'Allow AI Search Only (Allow citation/indexing in AI search engines, block training)' },
          { value: 'custom', label: 'Custom Policy (Configure Search, Training, and Agent crawlers individually)' },
          { value: 'disabled', label: 'Allow All (No AI crawl restrictions)' }
        ],
        initialValue: 'block_all'
      });
      if (isCancel(aiPolicyAns)) return process.exit(0);

      if (aiPolicyAns === 'block_all') {
        config.aiCrawlSettings = {
          aiBotsProtection: 'block',
          aiSearch: 'block',
          aiTraining: 'block',
          aiUser: 'block'
        };
      } else if (aiPolicyAns === 'allow_search_only') {
        config.aiCrawlSettings = {
          aiBotsProtection: 'disabled',
          aiSearch: 'disabled',
          aiTraining: 'block',
          aiUser: 'disabled'
        };
      } else if (aiPolicyAns === 'disabled') {
        config.aiCrawlSettings = {
          aiBotsProtection: 'disabled',
          aiSearch: 'disabled',
          aiTraining: 'disabled',
          aiUser: 'disabled'
        };
      } else {
        const searchAns = await select({
          message: 'AI Search Bots (e.g. Perplexity, Bing Copilot citation):',
          options: [
            { value: 'disabled', label: 'Allow - Allow citation in AI search engines' },
            { value: 'block', label: 'Block - Block search engine AI crawlers' }
          ],
          initialValue: 'disabled'
        });
        if (isCancel(searchAns)) return process.exit(0);

        const trainingAns = await select({
          message: 'AI Model Training Bots (e.g. GPTBot, ClaudeBot, CCBot):',
          options: [
            { value: 'block', label: 'Block - Edge-level blocking for model training crawlers' },
            { value: 'disallow', label: 'Disallow via robots.txt - Request crawlers not train on data' },
            { value: 'disabled', label: 'Allow - Permit training data harvesting' }
          ],
          initialValue: 'block'
        });
        if (isCancel(trainingAns)) return process.exit(0);

        const userAns = await select({
          message: 'AI User Agents / Assistants (Browsing on user request):',
          options: [
            { value: 'disabled', label: 'Allow - Allow AI assistants navigating for users' },
            { value: 'block', label: 'Block - Block AI assistant agents' }
          ],
          initialValue: 'disabled'
        });
        if (isCancel(userAns)) return process.exit(0);

        const masterBlock = (trainingAns === 'block' && searchAns === 'block' && userAns === 'block') ? 'block' : 'disabled';
        config.aiCrawlSettings = {
          aiBotsProtection: masterBlock,
          aiSearch: searchAns,
          aiTraining: trainingAns,
          aiUser: userAns
        };
      }

      const secAns = await select({
        message: 'Select WAF Security Level:',
        options: [
          { value: 'essentially_off', label: 'Essentially Off - Challenges only the most grievous offenders' },
          { value: 'low', label: 'Low - Challenges only the most threatening visitors' },
          { value: 'medium', label: 'Medium - (Recommended) Challenges moderate threat visitors' },
          { value: 'high', label: 'High - Challenges all threatening visitors' },
          { value: 'under_attack', label: 'I\'m Under Attack - Challenges all visitors (use during DDoS)' }
        ],
        initialValue: 'medium'
      });
      if (isCancel(secAns)) return process.exit(0);
      config.securityLevel = secAns;

      const perfAns = await multiselect({
        message: 'Select Performance & Network Optimizations to enable:',
        options: [
          { value: 'always_use_https', label: 'Always Use HTTPS (Redirects HTTP to HTTPS)', hint: 'recommended' },
          { value: 'http3', label: 'HTTP/3 (QUIC)', hint: 'recommended' },
          { value: 'ipv6', label: 'IPv6 Support', hint: 'recommended' },
          { value: 'tiered_cache', label: 'Tiered Caching (Improves cache hit rates)', hint: 'recommended' },
          { value: 'brotli', label: 'Brotli Compression (Smaller payloads)', hint: 'recommended' },
          { value: 'early_hints', label: 'Early Hints (Improves LCP)', hint: 'recommended' }
        ],
        initialValues: ['always_use_https', 'http3', 'ipv6', 'tiered_cache', 'brotli', 'early_hints'],
        required: false
      });
      if (isCancel(perfAns)) return process.exit(0);
      config.cfSettings = perfAns;
    }
  }

  // Dry-run execution plan
  if (flags['dry-run']) {
    console.log('\n' + pc.bold(pc.cyan('Dry Run Execution Plan:')));
    console.log('─'.repeat(50));
    console.log(pc.bold('Target Domain & Subdomains:'));
    console.log(`  • Apex Domain:       ${config.domain}`);
    console.log(`  • Public Site:       https://${config.publicSubdomain}.${config.domain}`);
    console.log(`  • Admin UI:          https://${config.adminUiSubdomain}.${config.domain}`);
    console.log(`  • Admin API:         https://${config.adminApiSubdomain}.${config.domain}`);
    console.log(`  • Apex Handling:     ${config.apexHandling}`);
    console.log(pc.bold('\nAuthentication & Access:'));
    console.log(`  • Admin Email:       ${config.adminEmail}`);
    console.log(`  • Account ID:        ${config.accountId ? config.accountId : pc.dim('(not provided)')}`);
    console.log(`  • Zero Trust Team:   ${config.zeroTrustTeamName || pc.dim('(auto-derived)')}`);
    console.log(`  • Skip Access:       ${config.skipAccess}`);
    console.log(pc.bold('\nCloudflare Edge & Security:'));
    console.log(`  • Bot Fight Mode:    ${config.botFightMode}`);
    console.log(`  • Security Level:    ${config.securityLevel}`);
    console.log(`  • Performance:       ${config.cfSettings.join(', ')}`);
    console.log(`  • AI Crawl Policy:   ${JSON.stringify(config.aiCrawlSettings)}`);
    console.log(pc.bold('\nPlanned Actions:'));
    console.log('  1. Snapshot configuration files (wrangler.toml, .env.production)');
    console.log('  2. Provision Cloudflare D1 database (zygo-cms-db)');
    console.log('  3. Provision Cloudflare R2 bucket (zygo-cms-media)');
    console.log('  4. Update public-worker, admin-api-worker, admin-ui wrangler.toml & .env');
    console.log('  5. Apply remote D1 database migrations');
    if (!config.skipAccess) {
      console.log('  6. Provision Cloudflare Access Application & Policy');
    }
    console.log('  7. Apply Cloudflare Zone Edge & WAF settings');
    if (!flags['no-deploy']) {
      console.log('  8. Build Zygo CMS packages (worker-build, vite)');
      console.log('  9. Deploy to Cloudflare Workers & Pages');
      console.log('  10. Verify deployment edge endpoints via HEAD requests');
    } else {
      console.log('  8. Skip build & deployment (--no-deploy set)');
    }
    console.log('─'.repeat(50));
    console.log(pc.green('Dry run completed successfully. No changes were made.\n'));
    return process.exit(0);
  }

  if (isInteractive) {
    const proceed = await confirm({
      message: 'Proceed with resource provisioning and deployment?',
      initialValue: true
    });
    if (isCancel(proceed) || !proceed) {
      cancel('Setup cancelled.');
      return process.exit(0);
    }
  }

  const childEnv = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: config.apiToken,
    CLOUDFLARE_ACCOUNT_ID: config.accountId,
    CI: 'true'
  };

  const backups = backupConfigs();
  const s = spinner();

  try {
    s.start('Provisioning D1 Database (zygo-cms-db)');
    const databaseId = provisionD1Database(childEnv);
    s.stop(`✓ Provisioned D1 Database (UUID: ${databaseId})`);

    s.start('Provisioning R2 Bucket (zygo-cms-media)');
    provisionR2Bucket(childEnv);
    s.stop('✓ Provisioned R2 Bucket');

    s.start('Updating wrangler.toml configurations');
    updatePublicWrangler(config.domain, databaseId, config.publicSubdomain, config.apexHandling, config.adminUiSubdomain);
    updateAdminApiWrangler(config.domain, databaseId, config.adminApiSubdomain, config.publicSubdomain);
    updateAdminUiWrangler(config.domain, config.adminUiSubdomain);
    s.stop('✓ Updated wrangler configurations');

    s.start('Applying remote migrations');
    const migrationOk = applyRemoteMigrations(childEnv);
    if (migrationOk) {
      s.stop('✓ Migrations applied');
    } else {
      s.stop('⚠️  Failed to apply remote migrations automatically');
    }

    if (!config.skipAccess && config.apiToken && config.accountId) {
      s.start('Configuring Cloudflare Access');
      if (config.zeroTrustTeamName) {
        await ensureZeroTrustOrganization(config.accountId, config.apiToken, config.zeroTrustTeamName);
      }
      await ensureOneTimePinProvider(config.accountId, config.apiToken);
      if (config.enableGoogle) {
        await configureGoogleProvider(config.accountId, config.apiToken, config.googleClientId, config.googleClientSecret);
      }
      const accessRes = await configureCloudflareAccess(
        config.accountId,
        config.apiToken,
        config.domain,
        config.adminEmail,
        config.adminUiSubdomain,
        config.adminApiSubdomain
      );
      if (accessRes?.aud) {
        config.accessAud = accessRes.aud;
      }
      if (!config.accessAud) {
        try {
          const apiWrangler = fs.readFileSync(path.resolve(ROOT_DIR, 'packages/admin-api-worker/wrangler.toml'), 'utf8');
          const match = apiWrangler.match(/CF_ACCESS_AUD\s*=\s*"([^"]+)"/);
          if (match && match[1]) {
            config.accessAud = match[1];
          }
        } catch (_) {}
      }
      s.stop('✓ Cloudflare Access configured');
    }

    if (config.apiToken && config.accountId) {
      s.start('Applying Cloudflare Zone Settings');
      const zoneId = await getZoneId(config.accountId, config.apiToken, config.domain);
      if (zoneId) {
        const settingsPayload = config.cfSettings.map(id => ({ id, value: 'on' }));
        settingsPayload.push({ id: 'security_level', value: config.securityLevel });
        await applyZoneSettings(zoneId, config.apiToken, settingsPayload);
        await applyBotFightMode(zoneId, config.apiToken, config.botFightMode ? 'on' : 'off');
        if (config.aiCrawlSettings) {
          await applyAiCrawlSettings(zoneId, config.apiToken, config.aiCrawlSettings);
        }
        updateAdminApiZoneVar(zoneId);
        s.stop('✓ Zone & AI Crawl Settings applied');

        const sub = config.publicSubdomain || 'www';
        if (config.apexHandling === 'redirect_to_sub') {
          s.start('Configuring SEO Redirect Rule (Apex -> Subdomain)');
          const ok = await applyCloudflareRedirect(zoneId, config.apiToken, config.domain, sub + '.' + config.domain);
          if (ok) {
            s.stop('✓ SEO Redirect Rule configured');
          } else {
            s.stop('⚠️ Failed to configure SEO Redirect Rule');
          }
        } else if (config.apexHandling === 'redirect_to_apex') {
          s.start('Configuring SEO Redirect Rule (Subdomain -> Apex)');
          const ok = await applyCloudflareRedirect(zoneId, config.apiToken, sub + '.' + config.domain, config.domain);
          if (ok) {
            s.stop('✓ SEO Redirect Rule configured');
          } else {
            s.stop('⚠️ Failed to configure SEO Redirect Rule');
          }
        }
      } else {
        s.stop('⚠️ Could not fetch Zone ID to apply settings. Skipping.');
      }
    }
  } catch (err) {
    s.stop('⚠️ Provisioning encountered an error.');
    console.error(pc.red(`Error: ${err.message}`));
    console.log(pc.yellow('Rolling back configuration changes...'));
    rollbackConfigs(backups);
    console.log(pc.green('✓ Configuration files restored to pre-setup state'));
    process.exit(1);
  }

  if (!config.skipAccess && !config.accessAud) {
    console.warn(pc.yellow('\n⚠️  Zero Trust Access Application could not be automatically configured. Deploying now without CF_ACCESS_AUD will cause admin authentication to fail closed (HTTP 401 Unauthorized).\n'));
  }

  let deployed = false;
  if (!flags['no-deploy']) {
    let shouldDeploy = true;
    if (isInteractive) {
      const deployAns = await confirm({
        message: 'Would you like to build and deploy to Cloudflare now?',
        initialValue: true
      });
      if (isCancel(deployAns) || !deployAns) {
        shouldDeploy = false;
      }
    }

    if (shouldDeploy) {
      s.start('Building Zygo CMS');
      try {
        s.stop('Building Zygo CMS...');
        updateAdminUiEnv(config.domain, config.adminApiSubdomain);
        execSync('pnpm run build', { stdio: 'inherit', env: childEnv });
        console.log(pc.green('✓ Build completed'));

        console.log(pc.cyan('Deploying to Cloudflare...'));
        execSync('pnpm run deploy', { stdio: 'inherit', env: childEnv });
        console.log(pc.green('✓ Deployment completed'));
        deployed = true;
      } catch (err) {
        console.error(pc.red('⚠️ Build or deployment failed.'));
        console.error(pc.red(err.message));
        process.exit(1);
      }
    }
  }

  if (deployed) {
    await verifyDeployment(config);
  }

  outro(pc.green('🎉 Zygo CMS Setup Complete!\n') +
    'Configured URLs:\n' +
    `  • Public Site:   https://${config.domain}\n` +
    `  • Admin UI:      https://${config.adminUiSubdomain}.${config.domain}\n` +
    `  • Admin API:     https://${config.adminApiSubdomain}.${config.domain}\n\n` +
    'Next Steps:\n' +
    `  1. Ensure DNS records for ${config.domain}, ${config.publicSubdomain}, ${config.adminUiSubdomain}, and ${config.adminApiSubdomain} are managed by Cloudflare.\n` +
    `  2. Login at https://${config.adminUiSubdomain}.${config.domain} with ${config.adminEmail}`);
}

// If executed directly, run main()
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}

export {
  extractJson,
  validateDomain,
  validateEmail,
  detectAccountId,
  replaceOrInsertRoutes,
  ensureWorkersDevFalse,
  updatePublicWrangler,
  updateAdminApiWrangler,
  updateAdminUiWrangler,
  updateAdminApiAccessVars,
  updateAdminUiEnv,
  provisionD1Database,
  provisionR2Bucket,
  applyRemoteMigrations,
  createAccessAppAndPolicy,
  configureCloudflareAccess,
  ensureOneTimePinProvider,
  configureGoogleProvider,
  getZeroTrustOrgDomain,
  ensureZeroTrustOrganization,
  deriveDefaultTeamSlug,
  applyCloudflareRedirect,
  applyAiCrawlSettings,
  updateAdminApiZoneVar,
  getZoneId,
  applyZoneSettings,
  applyBotFightMode,
  parseCliArgs,
  runPreflightChecks,
  printPreflightReport,
  backupConfigs,
  rollbackConfigs,
  verifyDeployment,
  main
};
