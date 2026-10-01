#!/usr/bin/env node

import { intro, outro, text, select, multiselect, confirm, spinner, isCancel, cancel } from '@clack/prompts';
import pc from 'picocolors';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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

function validateEmail(email) {
  if (!email) return null;
  const clean = email.trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(clean) ? clean : null;
}

function detectAccountId() {
  try {
    const out = execSync('npx wrangler whoami --json', { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
    const json = extractJson(out);
    if (json?.accounts && json.accounts.length > 0 && json.accounts[0].id) {
      return json.accounts[0].id;
    }
  } catch (_) {
    try {
      const out = execSync('npx wrangler whoami', { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
      const match = out.match(/[│|]\s*([a-f0-9]{32})\s*[│|]/i);
      if (match) return match[1];
    } catch (_) { }
  }
  return null;
}

const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

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

function updatePublicWrangler(domain, databaseId, publicSubdomain = 'www', customFilePath = null) {
  if (typeof publicSubdomain === 'string' && (publicSubdomain.endsWith('.toml') || publicSubdomain.includes('/') || publicSubdomain.includes('\\'))) {
    customFilePath = publicSubdomain;
    publicSubdomain = 'www';
  }
  const filePath = customFilePath || path.resolve(ROOT_DIR, 'packages/public-worker/wrangler.toml');
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`);

  const sub = publicSubdomain || 'www';
  const routesStr = `routes = [\n  { pattern = "${domain}", custom_domain = true },\n  { pattern = "${sub}.${domain}", custom_domain = true }\n]`;
  content = replaceOrInsertRoutes(content, routesStr);

  content = content.replace(/^[ \t]*PROPELAUTH_AUTH_URL[ \t]*=.*\r?\n?/gm, '');

  fs.writeFileSync(filePath, content, 'utf8');
}

function updateAdminApiWrangler(domain, databaseId, apiSubdomain = 'api', customFilePath = null) {
  if (typeof apiSubdomain === 'string' && (apiSubdomain.endsWith('.toml') || apiSubdomain.includes('/') || apiSubdomain.includes('\\'))) {
    customFilePath = apiSubdomain;
    apiSubdomain = 'api';
  }
  const filePath = customFilePath || path.resolve(ROOT_DIR, 'packages/admin-api-worker/wrangler.toml');
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`);

  const sub = apiSubdomain || 'api';
  const routesStr = `routes = [\n  { pattern = "${sub}.${domain}", custom_domain = true }\n]`;
  content = replaceOrInsertRoutes(content, routesStr);

  content = content.replace(/^[ \t]*PROPELAUTH_AUTH_URL[ \t]*=.*\r?\n?/gm, '');

  fs.writeFileSync(filePath, content, 'utf8');
}

function updateAdminUiWrangler(domain, uiSubdomain = 'admin', customFilePath = null) {
  if (typeof uiSubdomain === 'string' && (uiSubdomain.endsWith('.toml') || uiSubdomain.includes('/') || uiSubdomain.includes('\\'))) {
    customFilePath = uiSubdomain;
    uiSubdomain = 'admin';
  }
  const filePath = customFilePath || path.resolve(ROOT_DIR, 'packages/admin-ui/wrangler.toml');
  let content = fs.readFileSync(filePath, 'utf8');

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


function provisionD1Database() {
  console.log('\n[1/5] Provisioning Cloudflare D1 Database (zygo-cms-db)...');
  let databaseId = null;

  try {
    const listOut = execSync('npx wrangler d1 list --json', { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
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
      const createOut = execSync('npx wrangler d1 create zygo-cms-db --json', { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
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

function provisionR2Bucket() {
  console.log('\n[2/5] Provisioning Cloudflare R2 Media Bucket (zygo-cms-media)...');
  try {
    execSync('npx wrangler r2 bucket create zygo-cms-media', { stdio: ['pipe', 'pipe', 'pipe'] });
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

function applyRemoteMigrations() {
  console.log('\n[4/5] Applying remote D1 database migrations...');
  try {
    execSync('npx wrangler d1 migrations apply zygo-cms-db --remote -c packages/public-worker/wrangler.toml', {
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' }
    });
    console.log('✓ Remote D1 migrations applied successfully');
  } catch (err) {
    console.error(`⚠️  Failed to apply remote migrations automatically: ${err.message}`);
    console.log('You can apply migrations manually later using:');
    console.log('  npx wrangler d1 migrations apply zygo-cms-db --remote -c packages/public-worker/wrangler.toml');
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
        console.warn(`   4. Once complete, re-run "npm run setup" to automatically create the Access application!\n`);
      } else if (errorStr.includes('auth.forbidden') || errorStr.includes('1010')) {
        console.warn(`\n⚠️  API Token Forbidden (Error 1010: auth.forbidden).`);
        console.warn(`   Your Cloudflare API Token is missing permission to manage Zero Trust Access:`);
        console.warn(`   1. Open https://dash.cloudflare.com/profile/api-tokens in your browser.`);
        console.warn(`   2. Edit your API Token and ensure it includes:`);
        console.warn(`      • Account > Access: Apps and Policies -> Edit`);
        console.warn(`      • Account Resources -> Include -> All accounts (or your specific account)`);
        console.warn(`   3. Re-run "npm run setup" once updated.\n`);
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
      return true;
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
    return true;
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

async function configureCloudflareAccess(accountId, apiToken, domain, adminEmail, uiSubdomain = 'admin', apiSubdomain = 'api') {
  if (typeof uiSubdomain === 'object' && uiSubdomain !== null) {
    apiSubdomain = uiSubdomain.apiSubdomain || 'api';
    uiSubdomain = uiSubdomain.uiSubdomain || 'admin';
  }
  const uiSub = uiSubdomain || 'admin';
  const apiSub = apiSubdomain || 'api';
  const uiHost = `${uiSub}.${domain}`;
  const apiHost = `${apiSub}.${domain}`;
  const allowedOrigins = [`https://${uiHost}`, `https://${apiHost}`];

  try {
    const uiSuccess = await createAccessAppAndPolicy(accountId, apiToken, 'Zygo CMS Admin UI', uiHost, allowedOrigins, adminEmail);
    const apiSuccess = await createAccessAppAndPolicy(accountId, apiToken, 'Zygo CMS Admin API', apiHost, allowedOrigins, adminEmail);

    if (!uiSuccess || !apiSuccess) {
      printManualAccessInstructions(domain, adminEmail, uiSub, apiSub);
    }
  } catch (err) {
    console.warn(`⚠️  Could not configure Cloudflare Access via REST API: ${err.message}`);
    printManualAccessInstructions(domain, adminEmail, uiSub, apiSub);
  }
}


async function getZoneId(accountId, apiToken, domain) {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${domain}&account.id=${accountId}`, {
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

async function promptInput(rl, query, validator, defaultValue = null) {
  while (true) {
    const promptText = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
    const answer = await rl.question(promptText);
    if (answer === undefined || answer === null) {
      console.log('\nInput stream closed. Exiting setup.');
      process.exit(0);
    }
    const value = answer.trim() || defaultValue;
    if (!value) {
      if (!input.isTTY) {
        console.log('  Value cannot be empty (non-interactive EOF). Exiting setup.');
        process.exit(1);
      }
      console.log('  Value cannot be empty. Please try again.');
      continue;
    }
    const validated = validator(value);
    if (validated !== null && validated !== false) {
      return validated;
    }
    if (!input.isTTY) {
      console.log('  Invalid format (non-interactive input). Exiting setup.');
      process.exit(1);
    }
    console.log('  Invalid format. Please try again.');
  }
}

async function promptYesNo(rl, query, defaultYes = true) {
  const hint = defaultYes ? '(Y/n)' : '(y/N)';
  const answer = await rl.question(`${query} ${hint}: `);
  if (answer === undefined || answer === null) {
    return defaultYes;
  }
  const clean = answer.trim().toLowerCase();
  if (!clean) return defaultYes;
  return clean === 'y' || clean === 'yes';
}

async function main() {
  console.clear();
  intro(pc.bgCyan(pc.black(' 🚀 Welcome to the Zygo CMS Setup Wizard ')));
  console.log('This wizard will guide you through configuring and deploying');
  console.log('your high-performance edge CMS on Cloudflare Workers.\n');

  const detectedAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || detectAccountId();
  const detectedApiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || null;

  const config = {
    domain: '',
    publicSubdomain: 'www',
    adminUiSubdomain: 'admin',
    adminApiSubdomain: 'api',
    accountId: '',
    apiToken: '',
    adminEmail: '',
    enableGoogle: false,
    googleClientId: '',
    googleClientSecret: '',
    securityLevel: 'medium',
    botFightMode: true,
    cfSettings: []
  };

  const domainAns = await text({
    message: 'Apex Domain Name (e.g. example.com)',
    validate(value) {
      if (!value) return 'Value is required';
      if (!validateDomain(value)) return 'Invalid domain format';
    }
  });
  if (isCancel(domainAns)) { cancel('Setup cancelled'); return process.exit(0); }
  config.domain = domainAns.trim();

  const publicSubAns = await text({
    message: 'Public Subdomain',
    initialValue: 'www',
    defaultValue: 'www',
    placeholder: 'www',
    validate(value) {
      if (!value || !value.trim()) return 'Value is required';
    }
  });
  if (isCancel(publicSubAns)) { cancel('Setup cancelled'); return process.exit(0); }
  config.publicSubdomain = publicSubAns.trim();

  const adminUiSubAns = await text({
    message: 'Admin UI Subdomain',
    initialValue: 'admin',
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
    initialValue: 'api',
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
    initialValue: detectedAccountId || '',
    validate(value) {
      if (!value.trim()) return 'Account ID is required';
    }
  });
  if (isCancel(accountAns)) { cancel('Setup cancelled'); return process.exit(0); }
  config.accountId = accountAns.trim();

  const tokenAns = await text({
    message: 'Cloudflare API Token',
    initialValue: detectedApiToken || '',
    validate(value) {
      if (!value.trim()) return 'API Token is required';
    }
  });
  if (isCancel(tokenAns)) { cancel('Setup cancelled'); return process.exit(0); }
  config.apiToken = tokenAns.trim();

  const emailAns = await text({
    message: 'Admin User Email Address',
    validate(value) {
      if (!value) return 'Value is required';
      if (!validateEmail(value)) return 'Invalid email format';
    }
  });
  if (isCancel(emailAns)) { cancel('Setup cancelled'); return process.exit(0); }
  config.adminEmail = emailAns.trim();

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

    const clientSecretAns = await text({
      message: 'Google Client Secret',
      validate: (v) => !v.trim() ? 'Required' : undefined
    });
    if (isCancel(clientSecretAns)) return process.exit(0);
    config.googleClientSecret = clientSecretAns.trim();
  }

  const botAns = await confirm({
    message: 'Enable Bot Fight Mode? (Recommended to prevent malicious scraping)',
    initialValue: true
  });
  if (isCancel(botAns)) return process.exit(0);
  config.botFightMode = botAns;

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

  const proceed = await confirm({
    message: 'Proceed with resource provisioning and deployment?',
    initialValue: true
  });
  if (isCancel(proceed) || !proceed) {
    cancel('Setup cancelled.');
    return process.exit(0);
  }

  const s = spinner();
  
  // Mute stdout for subcommands unless they fail
  const execOpts = { stdio: 'pipe' };

  try {
    s.start('Provisioning D1 Database (zygo-cms-db)');
    const databaseId = provisionD1Database();
    s.stop(`✓ Provisioned D1 Database (UUID: ${databaseId})`);

    s.start('Provisioning R2 Bucket (zygo-cms-media)');
    provisionR2Bucket();
    s.stop('✓ Provisioned R2 Bucket');

    s.start('Updating wrangler.toml configurations');
    updatePublicWrangler(config.domain, databaseId, config.publicSubdomain);
    updateAdminApiWrangler(config.domain, databaseId, config.adminApiSubdomain);
    updateAdminUiWrangler(config.domain, config.adminUiSubdomain);
    s.stop('✓ Updated wrangler configurations');

    s.start('Applying remote migrations');
    applyRemoteMigrations();
    s.stop('✓ Migrations applied');

    s.start('Configuring Cloudflare Access');
    await ensureOneTimePinProvider(config.accountId, config.apiToken);
    if (config.enableGoogle) {
      await configureGoogleProvider(config.accountId, config.apiToken, config.googleClientId, config.googleClientSecret);
    }
    await configureCloudflareAccess(
      config.accountId,
      config.apiToken,
      config.domain,
      config.adminEmail,
      config.adminUiSubdomain,
      config.adminApiSubdomain
    );
    s.stop('✓ Cloudflare Access configured');

    s.start('Applying Cloudflare Zone Settings');
    const zoneId = await getZoneId(config.accountId, config.apiToken, config.domain);
    if (zoneId) {
      const settingsPayload = config.cfSettings.map(id => ({ id, value: 'on' }));
      settingsPayload.push({ id: 'security_level', value: config.securityLevel });
      await applyZoneSettings(zoneId, config.apiToken, settingsPayload);
      await applyBotFightMode(zoneId, config.apiToken, config.botFightMode ? 'on' : 'off');
      s.stop('✓ Zone Settings applied');
    } else {
      s.stop('⚠️ Could not fetch Zone ID to apply settings. Skipping.');
    }
  } catch (err) {
    s.stop('⚠️ Provisioning encountered an error.');
    console.error(pc.red(err.message));
    process.exit(1);
  }

  const shouldDeploy = await confirm({
    message: 'Would you like to build and deploy to Cloudflare now?',
    initialValue: true
  });

  if (shouldDeploy) {
    s.start('Building Zygo CMS');
    try {
      // Need real-time output for build/deploy
      s.stop('Building Zygo CMS...');
      updateAdminUiEnv(config.domain, config.adminApiSubdomain);
      execSync('npm run build', { stdio: 'inherit' });
      console.log(pc.green('✓ Build completed'));

      console.log(pc.cyan('Deploying to Cloudflare...'));
      execSync('npm run deploy', { stdio: 'inherit' });
      console.log(pc.green('✓ Deployment completed'));
    } catch (err) {
      console.error(pc.red('⚠️ Build or deployment failed.'));
      console.error(pc.red(err.message));
    }
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
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main();
}

export {
  extractJson,
  validateDomain,
  validateEmail,
  detectAccountId,
  replaceOrInsertRoutes,
  updatePublicWrangler,
  updateAdminApiWrangler,
  updateAdminUiWrangler,
  updateAdminUiEnv,
  provisionD1Database,
  provisionR2Bucket,
  createAccessAppAndPolicy,
  configureCloudflareAccess,
  ensureOneTimePinProvider,
  configureGoogleProvider,
  getZeroTrustOrgDomain,
};
