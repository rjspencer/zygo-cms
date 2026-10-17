#!/usr/bin/env node

import { intro, outro, text, confirm, spinner, isCancel, cancel } from '@clack/prompts';
import pc from 'picocolors';
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPO = 'rjspencer/zygo-cms';
const DEFAULT_BRANCH = 'main';
const PLACEHOLDER_DB_ID = '00000000-0000-0000-0000-000000000000';

const STRIP_PATHS = [
  'decisions',
  'docs/official',
  'docs/AGENTS.md',
  'docs/github-ruleset-setup.md',
  'scripts/seed_official_docs.mjs',
  '.github/workflows',
  '.github',
  'packages/create-zygo-app',
  'tests/create-zygo-app.test.js',
  'HANDOFF_unsaved_changes_blocker.md',
  '.env',
  '.env.production',
  'packages/admin-ui/.env.production',
  '.dev.vars',
  'packages/admin-api-worker/.dev.vars',
  'packages/public-worker/.dev.vars',
];

const ROOT_SCRATCH_PATTERNS = [
  /^HANDOFF_.*\.md$/i,
  /^fix_.*\.(js|mjs|py|sh)$/i,
  /^update_.*\.(js|mjs|py|sh)$/i,
];

const COPY_IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'target',
  '.wrangler',
  'build',
  'dist',
  'coverage',
  '.worktrees',
  'storybook-static',
]);

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    projectDir: null,
    templateDir: null,
    repo: DEFAULT_REPO,
    branch: DEFAULT_BRANCH,
    skipInstall: false,
    skipBuild: false,
    skipDb: false,
    skipGit: false,
    yes: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-y' || arg === '--yes') {
      options.yes = true;
    } else if (arg === '--skip-install') {
      options.skipInstall = true;
    } else if (arg === '--skip-build') {
      options.skipBuild = true;
    } else if (arg === '--skip-db') {
      options.skipDb = true;
    } else if (arg === '--skip-git') {
      options.skipGit = true;
    } else if (arg === '--template-dir') {
      options.templateDir = argv[++i] || null;
    } else if (arg.startsWith('--template-dir=')) {
      options.templateDir = arg.slice('--template-dir='.length) || null;
    } else if (arg === '--repo') {
      options.repo = argv[++i] || DEFAULT_REPO;
    } else if (arg.startsWith('--repo=')) {
      options.repo = arg.slice('--repo='.length) || DEFAULT_REPO;
    } else if (arg === '--branch') {
      options.branch = argv[++i] || DEFAULT_BRANCH;
    } else if (arg.startsWith('--branch=')) {
      options.branch = arg.slice('--branch='.length) || DEFAULT_BRANCH;
    } else if (!arg.startsWith('-') && !options.projectDir) {
      options.projectDir = arg;
    }
  }

  return options;
}

function normalizePackageName(name) {
  if (!name || typeof name !== 'string') return 'zygo-cms-app';
  const base = path.basename(name.trim());
  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  return normalized || 'zygo-cms-app';
}

function validateProjectName(input) {
  if (!input || typeof input !== 'string') {
    return 'Project directory name is required';
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return 'Project directory name cannot be empty';
  }
  if (trimmed === '.' || trimmed === '..') {
    return 'Please specify a subdirectory name rather than "." or ".."';
  }
  if (/[\0<>:"|?*]/.test(trimmed)) {
    return 'Project directory contains invalid characters';
  }
  const base = path.basename(trimmed).toLowerCase();
  if (base === 'node_modules' || base === '.git') {
    return `"${base}" is a reserved directory name`;
  }
  return null;
}

function isTargetDirAvailable(targetDir) {
  if (!fs.existsSync(targetDir)) {
    return { available: true };
  }
  const stat = fs.statSync(targetDir);
  if (!stat.isDirectory()) {
    return { available: false, reason: `Target path "${targetDir}" exists and is not a directory.` };
  }
  const entries = fs.readdirSync(targetDir).filter((entry) => entry !== '.DS_Store');
  if (entries.length > 0) {
    return { available: false, reason: `Target directory "${targetDir}" is not empty.` };
  }
  return { available: true };
}

function copyTemplateDirectory(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    if (entry.isDirectory() && COPY_IGNORE_DIRS.has(entry.name)) continue;

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyTemplateDirectory(srcPath, destPath);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function acquireTemplate({
  targetDir,
  templateDir = null,
  repo = DEFAULT_REPO,
  branch = DEFAULT_BRANCH,
  execFileFn = execFileSync,
  fetchFn = globalThis.fetch,
}) {
  if (templateDir) {
    const resolvedTemplate = path.resolve(templateDir);
    if (!fs.existsSync(resolvedTemplate)) {
      throw new Error(`Template directory does not exist: ${resolvedTemplate}`);
    }
    copyTemplateDirectory(resolvedTemplate, targetDir);
    return;
  }

  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)) {
    throw new Error(`Invalid repository format: "${repo}". Expected "owner/repo".`);
  }
  if (!/^[a-zA-Z0-9._/-]+$/.test(branch) || branch.includes('..')) {
    throw new Error(`Invalid branch name: "${branch}".`);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  try {
    execFileFn(
      'git',
      ['clone', '--depth', '1', '--branch', branch, `https://github.com/${repo}.git`, targetDir],
      { stdio: 'pipe' }
    );
    fs.rmSync(path.join(targetDir, '.git'), { recursive: true, force: true });
    return;
  } catch (_) {
    // Fall back to GitHub tarball download if git clone fails
  }

  const tarUrl = `https://codeload.github.com/${repo}/tar.gz/refs/heads/${branch}`;
  const res = await fetchFn(tarUrl);
  if (!res || !res.ok) {
    throw new Error(`Failed to download template from ${tarUrl} (status: ${res?.status ?? 'unknown'})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const tarPath = path.join(targetDir, '.zygo-template.tar.gz');
  fs.writeFileSync(tarPath, Buffer.from(arrayBuffer));

  try {
    execFileFn('tar', ['-xzf', tarPath, '--strip-components=1', '-C', targetDir], { stdio: 'pipe' });
  } finally {
    fs.rmSync(tarPath, { force: true });
  }
}

function stripRoutesBlock(tomlContent) {
  return tomlContent.replace(/\n*routes\s*=\s*\[[\s\S]*?\]\n*/g, '\n\n');
}

function sanitizeWranglerConfigs(targetDir) {
  const rootWranglerPath = path.join(targetDir, 'wrangler.toml');
  if (fs.existsSync(rootWranglerPath)) {
    let content = fs.readFileSync(rootWranglerPath, 'utf8');
    content = content.replace(/zygodactylstudios\.com/g, 'example.com');
    content = content.replace(/\(id:\s*[a-f0-9-]{36}\)/gi, `(id: ${PLACEHOLDER_DB_ID})`);
    content = content.replace(/database_id\s*=\s*"[^"]*"/g, `database_id = "${PLACEHOLDER_DB_ID}"`);
    fs.writeFileSync(rootWranglerPath, content, 'utf8');
  }

  const publicWranglerPath = path.join(targetDir, 'packages/public-worker/wrangler.toml');
  if (fs.existsSync(publicWranglerPath)) {
    let content = fs.readFileSync(publicWranglerPath, 'utf8');
    content = stripRoutesBlock(content);
    content = content.replace(/database_id\s*=\s*"[^"]*"/g, `database_id = "${PLACEHOLDER_DB_ID}"`);
    fs.writeFileSync(publicWranglerPath, content, 'utf8');
  }

  const apiWranglerPath = path.join(targetDir, 'packages/admin-api-worker/wrangler.toml');
  if (fs.existsSync(apiWranglerPath)) {
    let content = fs.readFileSync(apiWranglerPath, 'utf8');
    content = stripRoutesBlock(content);
    content = content.replace(/database_id\s*=\s*"[^"]*"/g, `database_id = "${PLACEHOLDER_DB_ID}"`);
    fs.writeFileSync(apiWranglerPath, content, 'utf8');
  }

  const uiWranglerPath = path.join(targetDir, 'packages/admin-ui/wrangler.toml');
  if (fs.existsSync(uiWranglerPath)) {
    let content = fs.readFileSync(uiWranglerPath, 'utf8');
    content = stripRoutesBlock(content);
    fs.writeFileSync(uiWranglerPath, content, 'utf8');
  }
}

function sanitizePackageJson(targetDir, projectName) {
  const pkgPath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.name = normalizePackageName(projectName);

  if (pkg.scripts) {
    delete pkg.scripts['seed:docs:official'];
    delete pkg.scripts['test:create'];
  }

  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`, 'utf8');
}

function sanitizeProject(targetDir, projectName) {
  for (const relPath of STRIP_PATHS) {
    const fullPath = path.join(targetDir, relPath);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }

  if (fs.existsSync(targetDir)) {
    const rootEntries = fs.readdirSync(targetDir, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (entry.isFile() && ROOT_SCRATCH_PATTERNS.some((re) => re.test(entry.name))) {
        fs.rmSync(path.join(targetDir, entry.name), { force: true });
      }
    }
  }

  sanitizePackageJson(targetDir, projectName);
  sanitizeWranglerConfigs(targetDir);
}

function writeLocalEnvFiles(targetDir) {
  const devVarsContent = 'ENVIRONMENT=dev\nEDGE_TTL_SECONDS=3600\n';

  fs.writeFileSync(path.join(targetDir, '.dev.vars'), devVarsContent, 'utf8');

  const apiDir = path.join(targetDir, 'packages/admin-api-worker');
  if (fs.existsSync(apiDir)) {
    fs.writeFileSync(path.join(apiDir, '.dev.vars'), devVarsContent, 'utf8');
  }

  const envDevPath = path.join(targetDir, '.env.development');
  fs.writeFileSync(envDevPath, 'VITE_PUBLIC_SITE_URL=http://localhost:8788\n', 'utf8');
}

function runBootstrapSteps(targetDir, options = {}, execFn = execSync, onStep = null) {
  const notify = (phase, msg) => {
    if (typeof onStep === 'function') onStep(phase, msg);
  };

  if (!options.skipInstall) {
    notify('start', 'Installing dependencies with pnpm...');
    execFn('pnpm install', { cwd: targetDir, stdio: 'pipe' });
    notify('stop', '✓ Installed dependencies');
  }

  if (!options.skipBuild) {
    notify('start', 'Building Rust Wasm workers and Admin UI...');
    execFn('pnpm --filter template-wasm run build', { cwd: targetDir, stdio: 'pipe' });
    execFn('pnpm run build', { cwd: targetDir, stdio: 'pipe' });
    notify('stop', '✓ Built Wasm workers and Admin UI');
  }

  if (!options.skipDb) {
    notify('start', 'Initializing local D1 database migrations...');
    execFn('pnpm run db:migrate:local', { cwd: targetDir, stdio: 'pipe' });
    notify('stop', '✓ Applied local D1 database migrations');
  }

  if (!options.skipGit) {
    notify('start', 'Initializing Git repository...');
    execFn('git init', { cwd: targetDir, stdio: 'pipe' });
    notify('stop', '✓ Initialized Git repository');
  }
}

async function scaffoldProject({
  targetDir,
  projectName,
  templateDir = null,
  repo = DEFAULT_REPO,
  branch = DEFAULT_BRANCH,
  skipInstall = false,
  skipBuild = false,
  skipDb = false,
  skipGit = false,
  execFn = execSync,
  execFileFn = execFileSync,
  fetchFn = globalThis.fetch,
  onStep = null,
}) {
  const resolvedTarget = path.resolve(targetDir);
  const check = isTargetDirAvailable(resolvedTarget);
  if (!check.available) {
    throw new Error(check.reason);
  }

  const notify = (phase, msg) => {
    if (typeof onStep === 'function') onStep(phase, msg);
  };

  notify('start', 'Fetching Zygo CMS starter template...');
  await acquireTemplate({
    targetDir: resolvedTarget,
    templateDir,
    repo,
    branch,
    execFileFn,
    fetchFn,
  });
  notify('stop', '✓ Fetched Zygo CMS starter template');

  notify('start', 'Sanitizing project files and wrangler configurations...');
  sanitizeProject(resolvedTarget, projectName || path.basename(resolvedTarget));
  writeLocalEnvFiles(resolvedTarget);
  notify('stop', '✓ Sanitized project files and configured local dev environment');

  runBootstrapSteps(
    resolvedTarget,
    { skipInstall, skipBuild, skipDb, skipGit },
    execFn,
    onStep
  );

  return {
    targetDir: resolvedTarget,
    packageName: normalizePackageName(projectName || path.basename(resolvedTarget)),
  };
}

function printHelp() {
  console.log(`
${pc.bold(pc.cyan('create-zygo-app'))} — Bootstrap a clean Zygo CMS project

${pc.bold('Usage:')}
  npx create-zygo-app <project-directory> [options]

${pc.bold('Options:')}
  --template-dir <path>   Copy template from a local directory instead of GitHub
  --repo <owner/repo>     GitHub repository to fetch (default: ${DEFAULT_REPO})
  --branch <branch>       Git branch to fetch (default: ${DEFAULT_BRANCH})
  --skip-install          Skip running pnpm install
  --skip-build            Skip building Wasm workers and Admin UI
  --skip-db               Skip applying local D1 database migrations
  --skip-git              Skip initializing a Git repository
  -y, --yes               Skip interactive confirmation prompts
  -h, --help              Display this help message
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  intro(pc.bgCyan(pc.black(' ⚡ create-zygo-app ')));

  let projectDir = options.projectDir;
  if (!projectDir) {
    if (options.yes) {
      projectDir = 'my-zygo-app';
    } else {
      const dirAns = await text({
        message: 'Where would you like to create your Zygo CMS project?',
        placeholder: 'my-zygo-app',
        initialValue: 'my-zygo-app',
        validate(value) {
          const err = validateProjectName(value);
          if (err) return err;
          const check = isTargetDirAvailable(path.resolve(value.trim()));
          if (!check.available) return check.reason;
        },
      });
      if (isCancel(dirAns)) {
        cancel('Scaffolding cancelled.');
        process.exit(0);
      }
      projectDir = dirAns.trim();
    }
  } else {
    const err = validateProjectName(projectDir);
    if (err) {
      console.error(pc.red(`Error: ${err}`));
      process.exit(1);
    }
  }

  const targetDir = path.resolve(projectDir);
  const availability = isTargetDirAvailable(targetDir);
  if (!availability.available) {
    console.error(pc.red(`Error: ${availability.reason}`));
    process.exit(1);
  }

  const defaultPkgName = normalizePackageName(projectDir);
  let projectName = defaultPkgName;

  if (!options.yes) {
    const nameAns = await text({
      message: 'Project package name',
      initialValue: defaultPkgName,
      placeholder: defaultPkgName,
      validate(value) {
        if (!value || !value.trim()) return 'Package name is required';
      },
    });
    if (isCancel(nameAns)) {
      cancel('Scaffolding cancelled.');
      process.exit(0);
    }
    projectName = normalizePackageName(nameAns);

    if (!options.skipBuild) {
      const buildAns = await confirm({
        message: 'Build Rust Wasm workers and Admin UI during setup?',
        initialValue: true,
      });
      if (isCancel(buildAns)) {
        cancel('Scaffolding cancelled.');
        process.exit(0);
      }
      options.skipBuild = !buildAns;
    }
  }

  const s = spinner();
  try {
    await scaffoldProject({
      targetDir,
      projectName,
      templateDir: options.templateDir,
      repo: options.repo,
      branch: options.branch,
      skipInstall: options.skipInstall,
      skipBuild: options.skipBuild,
      skipDb: options.skipDb,
      skipGit: options.skipGit,
      onStep(phase, msg) {
        if (phase === 'start') s.start(msg);
        else if (phase === 'stop') s.stop(msg);
      },
    });
  } catch (err) {
    s.stop(pc.red('✗ Scaffolding failed'));
    console.error(pc.red(err.message));
    process.exit(1);
  }

  const relDir = path.relative(process.cwd(), targetDir) || '.';
  outro(
    `${pc.green('🎉 Your Zygo CMS project is ready!')}\n\n` +
      `${pc.bold('Next steps:')}\n` +
      `  ${pc.cyan(`cd ${relDir}`)}\n` +
      (options.skipInstall ? `  ${pc.cyan('pnpm install')}\n` : '') +
      (options.skipBuild ? `  ${pc.cyan('pnpm --filter template-wasm run build && pnpm run build')}\n` : '') +
      (options.skipDb ? `  ${pc.cyan('pnpm run db:migrate:local')}\n` : '') +
      `  ${pc.cyan('pnpm run dev')}\n\n` +
      `${pc.bold('Local services:')}\n` +
      `  • Public Site:   http://localhost:8788/\n` +
      `  • Admin API:     http://localhost:8787/api\n` +
      `  • Admin UI:      http://localhost:3000/\n\n` +
      `${pc.dim('When you are ready to deploy to Cloudflare production, run:')} ${pc.cyan('pnpm run setup')}`
  );
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main();
}

export {
  DEFAULT_REPO,
  DEFAULT_BRANCH,
  PLACEHOLDER_DB_ID,
  STRIP_PATHS,
  parseArgs,
  normalizePackageName,
  validateProjectName,
  isTargetDirAvailable,
  copyTemplateDirectory,
  acquireTemplate,
  stripRoutesBlock,
  sanitizeWranglerConfigs,
  sanitizePackageJson,
  sanitizeProject,
  writeLocalEnvFiles,
  runBootstrapSteps,
  scaffoldProject,
};
