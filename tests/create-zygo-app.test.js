import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_REPO,
  DEFAULT_BRANCH,
  PLACEHOLDER_DB_ID,
  isCliInvocation,
  parseArgs,
  normalizePackageName,
  validateProjectName,
  isTargetDirAvailable,
  copyTemplateDirectory,
  acquireTemplate,
  sanitizeWranglerConfigs,
  sanitizePackageJson,
  sanitizeProject,
  writeLocalEnvFiles,
  runBootstrapSteps,
  scaffoldProject,
} from '../packages/create-zygo-app/index.mjs';
import {
  updatePublicWrangler,
  updateAdminApiWrangler,
  updateAdminUiWrangler,
} from '../scripts/setup.mjs';

const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

describe('create-zygo-app CLI Scaffolder', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zygo-scaffolder-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe('parseArgs', () => {
    it('returns default options when no arguments are passed', () => {
      expect(DEFAULT_BRANCH).toBe('release');
      const opts = parseArgs([]);
      expect(opts).toEqual({
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
      });
    });

    it('parses positional projectDir and boolean flags', () => {
      const opts = parseArgs([
        'my-blog',
        '--skip-install',
        '--skip-build',
        '--skip-db',
        '--skip-git',
        '-y',
      ]);
      expect(opts.projectDir).toBe('my-blog');
      expect(opts.skipInstall).toBe(true);
      expect(opts.skipBuild).toBe(true);
      expect(opts.skipDb).toBe(true);
      expect(opts.skipGit).toBe(true);
      expect(opts.yes).toBe(true);
    });

    it('parses space-separated and equals-separated value flags', () => {
      const opts1 = parseArgs(['site-a', '--template-dir', '/tmp/tpl', '--repo', 'org/repo', '--branch', 'dev']);
      expect(opts1.templateDir).toBe('/tmp/tpl');
      expect(opts1.repo).toBe('org/repo');
      expect(opts1.branch).toBe('dev');

      const opts2 = parseArgs(['site-b', '--template-dir=/tmp/tpl2', '--repo=org/repo2', '--branch=feat']);
      expect(opts2.templateDir).toBe('/tmp/tpl2');
      expect(opts2.repo).toBe('org/repo2');
      expect(opts2.branch).toBe('feat');
    });
  });

  describe('isCliInvocation', () => {
    it('returns true when argv[1] is named create-zygo-app or index.mjs', () => {
      expect(isCliInvocation('/usr/local/bin/create-zygo-app')).toBe(true);
      expect(isCliInvocation('/Users/user/.npm/_npx/abc/node_modules/.bin/create-zygo-app')).toBe(true);
      expect(isCliInvocation('./index.mjs')).toBe(true);
    });

    it('returns false when argv[1] is empty or run from a test runner like vitest', () => {
      expect(isCliInvocation(undefined)).toBe(false);
      expect(isCliInvocation(null)).toBe(false);
      expect(isCliInvocation('/workspace/node_modules/.bin/vitest')).toBe(false);
      expect(isCliInvocation('/usr/local/lib/node_modules/vitest/dist/cli.js')).toBe(false);
    });
  });

  describe('normalizePackageName & validateProjectName', () => {
    it('normalizes directory paths and names into valid package names', () => {
      expect(normalizePackageName('My Cool Blog!')).toBe('my-cool-blog');
      expect(normalizePackageName('./nested/path/Acme_CMS')).toBe('acme_cms');
      expect(normalizePackageName('---test---')).toBe('test');
      expect(normalizePackageName('')).toBe('zygo-cms-app');
    });

    it('validates acceptable project directory names and rejects invalid ones', () => {
      expect(validateProjectName('my-zygo-site')).toBeNull();
      expect(validateProjectName('./apps/my-site')).toBeNull();
      expect(validateProjectName('')).toMatch(/required/i);
      expect(validateProjectName('   ')).toMatch(/empty/i);
      expect(validateProjectName('.')).toMatch(/subdirectory/i);
      expect(validateProjectName('..')).toMatch(/subdirectory/i);
      expect(validateProjectName('node_modules')).toMatch(/reserved/i);
      expect(validateProjectName('.git')).toMatch(/reserved/i);
      expect(validateProjectName('bad:name*')).toMatch(/invalid/i);
    });
  });

  describe('isTargetDirAvailable', () => {
    it('allows non-existent or empty directories', () => {
      const nonExistent = path.join(tmpRoot, 'new-dir');
      expect(isTargetDirAvailable(nonExistent)).toEqual({ available: true });

      fs.mkdirSync(nonExistent);
      expect(isTargetDirAvailable(nonExistent)).toEqual({ available: true });

      fs.writeFileSync(path.join(nonExistent, '.DS_Store'), '');
      expect(isTargetDirAvailable(nonExistent)).toEqual({ available: true });
    });

    it('rejects non-empty directories or existing files', () => {
      const nonEmpty = path.join(tmpRoot, 'occupied');
      fs.mkdirSync(nonEmpty);
      fs.writeFileSync(path.join(nonEmpty, 'index.js'), 'console.log(1);');
      const res1 = isTargetDirAvailable(nonEmpty);
      expect(res1.available).toBe(false);
      expect(res1.reason).toMatch(/not empty/i);

      const fileTarget = path.join(tmpRoot, 'some-file');
      fs.writeFileSync(fileTarget, 'hello');
      const res2 = isTargetDirAvailable(fileTarget);
      expect(res2.available).toBe(false);
      expect(res2.reason).toMatch(/not a directory/i);
    });
  });

  describe('sanitizeWranglerConfigs & setup.mjs interoperability', () => {
    it('strips zygodactylstudios.com routes, sets placeholder database_id, and works with setup.mjs updaters', () => {
      fs.mkdirSync(path.join(tmpRoot, 'packages/public-worker'), { recursive: true });
      fs.mkdirSync(path.join(tmpRoot, 'packages/admin-api-worker'), { recursive: true });
      fs.mkdirSync(path.join(tmpRoot, 'packages/admin-ui'), { recursive: true });

      fs.copyFileSync(path.join(ROOT_DIR, 'wrangler.toml'), path.join(tmpRoot, 'wrangler.toml'));
      fs.copyFileSync(
        path.join(ROOT_DIR, 'packages/public-worker/wrangler.toml'),
        path.join(tmpRoot, 'packages/public-worker/wrangler.toml')
      );
      fs.copyFileSync(
        path.join(ROOT_DIR, 'packages/admin-api-worker/wrangler.toml'),
        path.join(tmpRoot, 'packages/admin-api-worker/wrangler.toml')
      );
      fs.copyFileSync(
        path.join(ROOT_DIR, 'packages/admin-ui/wrangler.toml'),
        path.join(tmpRoot, 'packages/admin-ui/wrangler.toml')
      );

      sanitizeWranglerConfigs(tmpRoot);

      const rootToml = fs.readFileSync(path.join(tmpRoot, 'wrangler.toml'), 'utf8');
      const pubToml = fs.readFileSync(path.join(tmpRoot, 'packages/public-worker/wrangler.toml'), 'utf8');
      const apiToml = fs.readFileSync(path.join(tmpRoot, 'packages/admin-api-worker/wrangler.toml'), 'utf8');
      const uiToml = fs.readFileSync(path.join(tmpRoot, 'packages/admin-ui/wrangler.toml'), 'utf8');

      for (const content of [rootToml, pubToml, apiToml, uiToml]) {
        expect(content).not.toContain('zygodactylstudios.com');
        expect(content).not.toContain('488417e7-4ad1-4875-90e9-71a0ac3dbc63');
      }

      expect(rootToml).toContain(`database_id = "${PLACEHOLDER_DB_ID}"`);
      expect(pubToml).toContain(`database_id = "${PLACEHOLDER_DB_ID}"`);
      expect(apiToml).toContain(`database_id = "${PLACEHOLDER_DB_ID}"`);
      expect(pubToml).not.toMatch(/routes\s*=\s*\[/);
      expect(apiToml).not.toMatch(/routes\s*=\s*\[/);
      expect(uiToml).not.toMatch(/routes\s*=\s*\[/);

      // Verify setup.mjs can cleanly populate routes and database_id on sanitized files
      const newDbId = '11111111-2222-3333-4444-555555555555';
      updatePublicWrangler(
        'customblog.io',
        newDbId,
        'www',
        'redirect_to_sub',
        path.join(tmpRoot, 'packages/public-worker/wrangler.toml')
      );
      updateAdminApiWrangler(
        'customblog.io',
        newDbId,
        'api',
        'www',
        path.join(tmpRoot, 'packages/admin-api-worker/wrangler.toml')
      );
      updateAdminUiWrangler(
        'customblog.io',
        'admin',
        path.join(tmpRoot, 'packages/admin-ui/wrangler.toml')
      );

      const pubAfterSetup = fs.readFileSync(path.join(tmpRoot, 'packages/public-worker/wrangler.toml'), 'utf8');
      const apiAfterSetup = fs.readFileSync(path.join(tmpRoot, 'packages/admin-api-worker/wrangler.toml'), 'utf8');
      const uiAfterSetup = fs.readFileSync(path.join(tmpRoot, 'packages/admin-ui/wrangler.toml'), 'utf8');
      expect(pubToml).toContain('workers_dev = false');
      expect(apiToml).toContain('workers_dev = false');
      expect(uiToml).toContain('workers_dev = false');

      expect(pubAfterSetup).toContain(`database_id = "${newDbId}"`);
      expect(pubAfterSetup).toContain('pattern = "customblog.io"');
      expect(pubAfterSetup).toContain('pattern = "www.customblog.io"');
      expect(pubAfterSetup).toContain('workers_dev = false');
      expect(apiAfterSetup).toContain(`database_id = "${newDbId}"`);
      expect(apiAfterSetup).toContain('pattern = "api.customblog.io"');
      expect(apiAfterSetup).toContain('workers_dev = false');
      expect(uiAfterSetup).toContain('pattern = "admin.customblog.io"');
      expect(uiAfterSetup).toContain('workers_dev = false');
    });
  });

  describe('acquireTemplate remote modes', () => {
    it('clones repository via git and strips .git directory', async () => {
      const targetDir = path.join(tmpRoot, 'cloned-app');
      const execFileFn = vi.fn((cmd, args) => {
        if (cmd === 'git') {
          fs.mkdirSync(path.join(targetDir, '.git'), { recursive: true });
          fs.writeFileSync(path.join(targetDir, 'README.md'), '# Cloned');
        }
      });

      await acquireTemplate({
        targetDir,
        repo: 'rjspencer/zygo-cms',
        branch: 'release',
        execFileFn,
      });

      expect(execFileFn).toHaveBeenCalledWith(
        'git',
        ['clone', '--depth', '1', '--branch', 'release', 'https://github.com/rjspencer/zygo-cms.git', targetDir],
        { stdio: 'pipe' }
      );
      expect(fs.existsSync(path.join(targetDir, '.git'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'README.md'))).toBe(true);
    });

    it('falls back to downloading GitHub tarball when git clone fails', async () => {
      const targetDir = path.join(tmpRoot, 'tarball-app');
      const execFileFn = vi.fn((cmd) => {
        if (cmd === 'git') {
          throw new Error('git not installed');
        }
        if (cmd === 'tar') {
          fs.writeFileSync(path.join(targetDir, 'package.json'), '{"name":"zygo-cms"}');
        }
      });
      const fetchFn = vi.fn(async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }));

      await acquireTemplate({
        targetDir,
        repo: 'rjspencer/zygo-cms',
        branch: 'release',
        execFileFn,
        fetchFn,
      });

      expect(fetchFn).toHaveBeenCalledWith('https://codeload.github.com/rjspencer/zygo-cms/tar.gz/refs/heads/release');
      expect(execFileFn).toHaveBeenCalledWith(
        'tar',
        ['-xzf', path.join(targetDir, '.zygo-template.tar.gz'), '--strip-components=1', '-C', targetDir],
        { stdio: 'pipe' }
      );
      expect(fs.existsSync(path.join(targetDir, '.zygo-template.tar.gz'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'package.json'))).toBe(true);
    });

    it('rejects malformed repo or branch arguments', async () => {
      const targetDir = path.join(tmpRoot, 'bad-repo');
      await expect(
        acquireTemplate({ targetDir, repo: 'bad;rm -rf /', branch: 'release' })
      ).rejects.toThrow(/Invalid repository format/);

      await expect(
        acquireTemplate({ targetDir, repo: 'rjspencer/zygo-cms', branch: '../etc' })
      ).rejects.toThrow(/Invalid branch name/);
    });
  });

  describe('runBootstrapSteps', () => {
    it('executes install, build, db migration, and git init in order when no skip flags are set', () => {
      const calls = [];
      const execFn = vi.fn((cmd) => calls.push(cmd));

      runBootstrapSteps(tmpRoot, {}, execFn);

      expect(calls).toEqual([
        'pnpm install',
        'pnpm run build',
        'pnpm run db:migrate:local',
        'git init',
      ]);
    });

    it('skips steps according to skip flags', () => {
      const calls = [];
      const execFn = vi.fn((cmd) => calls.push(cmd));

      runBootstrapSteps(
        tmpRoot,
        { skipInstall: true, skipBuild: true, skipDb: false, skipGit: true },
        execFn
      );

      expect(calls).toEqual(['pnpm run db:migrate:local']);
    });
  });

  describe('copyTemplateDirectory & pre-built Wasm preservation', () => {
    it('preserves pre-built Wasm directories while still ignoring transient folders', () => {
      const srcDir = path.join(tmpRoot, 'src-tpl');
      const destDir = path.join(tmpRoot, 'dest-app');

      // Create pre-built wasm directories and artifacts
      const wasmDirs = [
        'packages/public-worker/build',
        'packages/admin-api-worker/build',
        'packages/template-wasm/pkg',
      ];
      for (const d of wasmDirs) {
        fs.mkdirSync(path.join(srcDir, d), { recursive: true });
      }

      fs.writeFileSync(path.join(srcDir, 'packages/public-worker/build/index.js'), 'export default {}');
      fs.writeFileSync(path.join(srcDir, 'packages/public-worker/build/index.wasm'), 'wasm-pub-bytes');
      fs.writeFileSync(path.join(srcDir, 'packages/admin-api-worker/build/index.js'), 'export default {}');
      fs.writeFileSync(path.join(srcDir, 'packages/admin-api-worker/build/index.wasm'), 'wasm-api-bytes');
      fs.writeFileSync(path.join(srcDir, 'packages/template-wasm/pkg/template_wasm.js'), 'export function render() {}');
      fs.writeFileSync(path.join(srcDir, 'packages/template-wasm/pkg/template_wasm_bg.wasm'), 'wasm-tpl-bytes');

      // Create normal files
      fs.mkdirSync(path.join(srcDir, 'packages/public-worker/src'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'packages/public-worker/src/lib.rs'), '// rust code');

      // Create directories that MUST be ignored
      fs.mkdirSync(path.join(srcDir, '.git'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, '.git/config'), 'git-config');

      fs.mkdirSync(path.join(srcDir, 'node_modules/some-pkg'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'node_modules/some-pkg/index.js'), 'pkg');

      fs.mkdirSync(path.join(srcDir, 'build'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'build/temp.txt'), 'temp');

      fs.mkdirSync(path.join(srcDir, 'packages/admin-ui/dist'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'packages/admin-ui/dist/app.js'), 'dist');

      copyTemplateDirectory(srcDir, destDir);

      // Verify pre-built Wasm artifacts are preserved
      expect(fs.existsSync(path.join(destDir, 'packages/public-worker/build/index.js'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'packages/public-worker/build/index.wasm'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'packages/admin-api-worker/build/index.js'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'packages/admin-api-worker/build/index.wasm'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'packages/template-wasm/pkg/template_wasm.js'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'packages/template-wasm/pkg/template_wasm_bg.wasm'))).toBe(true);

      // Verify regular files are copied
      expect(fs.existsSync(path.join(destDir, 'packages/public-worker/src/lib.rs'))).toBe(true);

      // Verify standard transient / ignored directories are not copied
      expect(fs.existsSync(path.join(destDir, '.git'))).toBe(false);
      expect(fs.existsSync(path.join(destDir, 'node_modules'))).toBe(false);
      expect(fs.existsSync(path.join(destDir, 'build'))).toBe(false);
      expect(fs.existsSync(path.join(destDir, 'packages/admin-ui/dist'))).toBe(false);
    });
  });

  describe('scaffoldProject end-to-end sanitization', () => {
    it('scaffolds a clean project from a template directory and removes internal files', async () => {
      // Construct a realistic mock template mirroring the monorepo structure
      const mockTpl = path.join(tmpRoot, 'template-src');
      const targetDir = path.join(tmpRoot, 'my-new-cms');

      const dirsToCreate = [
        'decisions',
        'docs/specs',
        'docs/audits',
        'docs/official',
        '.github/workflows',
        'packages/create-zygo-app',
        'packages/public-worker/src',
        'packages/public-worker/build',
        'packages/admin-api-worker/src',
        'packages/admin-api-worker/build',
        'packages/admin-ui/src',
        'packages/core/src',
        'packages/template-wasm/src',
        'packages/template-wasm/pkg',
        'packages/zygo-mcp',
        'migrations',
        'scripts',
        'tests',
        '.agents/skills/zygo-theming',
      ];
      for (const d of dirsToCreate) {
        fs.mkdirSync(path.join(mockTpl, d), { recursive: true });
      }

      // Copy real configs & scripts to verify exact sanitization
      fs.copyFileSync(path.join(ROOT_DIR, 'package.json'), path.join(mockTpl, 'package.json'));
      fs.copyFileSync(path.join(ROOT_DIR, 'wrangler.toml'), path.join(mockTpl, 'wrangler.toml'));
      fs.copyFileSync(
        path.join(ROOT_DIR, 'packages/public-worker/wrangler.toml'),
        path.join(mockTpl, 'packages/public-worker/wrangler.toml')
      );
      fs.copyFileSync(
        path.join(ROOT_DIR, 'packages/admin-api-worker/wrangler.toml'),
        path.join(mockTpl, 'packages/admin-api-worker/wrangler.toml')
      );
      fs.copyFileSync(
        path.join(ROOT_DIR, 'packages/admin-ui/wrangler.toml'),
        path.join(mockTpl, 'packages/admin-ui/wrangler.toml')
      );
      fs.copyFileSync(path.join(ROOT_DIR, 'scripts/setup.mjs'), path.join(mockTpl, 'scripts/setup.mjs'));

      // Populate internal files that MUST be stripped
      fs.writeFileSync(path.join(mockTpl, 'decisions/future_improvements.md'), '# Roadmap');
      fs.writeFileSync(path.join(mockTpl, 'ROADMAP.md'), '# Roadmap');
      fs.writeFileSync(path.join(mockTpl, 'CHANGELOG.md'), '# Changelog');
      fs.writeFileSync(path.join(mockTpl, 'docs/specs/spec.md'), '# Spec');
      fs.writeFileSync(path.join(mockTpl, 'docs/audits/audit.md'), '# Audit');
      fs.writeFileSync(path.join(mockTpl, 'docs/official/introduction.md'), '# Intro');
      fs.writeFileSync(path.join(mockTpl, 'docs/AGENTS.md'), '# Docs Agents');
      fs.writeFileSync(path.join(mockTpl, 'docs/github-ruleset-setup.md'), '# Ruleset');
      fs.writeFileSync(path.join(mockTpl, 'docs/domain-and-dns-setup.md'), '# DNS Setup');
      fs.writeFileSync(path.join(mockTpl, 'scripts/seed_official_docs.mjs'), '// seed');
      fs.writeFileSync(path.join(mockTpl, '.github/workflows/deploy.yml'), 'name: CI');
      fs.writeFileSync(path.join(mockTpl, 'packages/create-zygo-app/index.mjs'), '// cli');
      fs.writeFileSync(path.join(mockTpl, 'tests/create-zygo-app.test.js'), '// test');
      fs.writeFileSync(path.join(mockTpl, 'HANDOFF_unsaved_changes_blocker.md'), '# Handoff');
      fs.writeFileSync(path.join(mockTpl, 'fix_ui.py'), 'print(1)');
      fs.writeFileSync(path.join(mockTpl, 'update_db.sh'), 'echo 1');
      fs.writeFileSync(path.join(mockTpl, '.env.production'), 'SECRET=123');

      // Pre-built Wasm artifacts
      fs.writeFileSync(path.join(mockTpl, 'packages/public-worker/build/index.js'), '// wasm public');
      fs.writeFileSync(path.join(mockTpl, 'packages/admin-api-worker/build/index.js'), '// wasm api');
      fs.writeFileSync(path.join(mockTpl, 'packages/template-wasm/pkg/template_wasm.js'), '// wasm template');

      const result = await scaffoldProject({
        targetDir,
        projectName: 'My New CMS',
        templateDir: mockTpl,
        skipInstall: true,
        skipBuild: true,
        skipDb: true,
        skipGit: true,
      });

      expect(result.packageName).toBe('my-new-cms');

      // Internal artifacts must be stripped
      expect(fs.existsSync(path.join(targetDir, 'decisions'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'ROADMAP.md'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'CHANGELOG.md'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'docs/specs'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'docs/audits'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'docs/official'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'docs/AGENTS.md'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'docs/github-ruleset-setup.md'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'scripts/seed_official_docs.mjs'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, '.github'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'packages/create-zygo-app'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'tests/create-zygo-app.test.js'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'HANDOFF_unsaved_changes_blocker.md'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'fix_ui.py'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'update_db.sh'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, '.env.production'))).toBe(false);

      // Essential user-facing files must be preserved
      expect(fs.existsSync(path.join(targetDir, 'docs/domain-and-dns-setup.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'scripts/setup.mjs'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, '.agents/skills/zygo-theming'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'packages/public-worker'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'packages/admin-api-worker'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'packages/admin-ui'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'packages/public-worker/build/index.js'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'packages/admin-api-worker/build/index.js'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'packages/template-wasm/pkg/template_wasm.js'))).toBe(true);

      // package.json must be sanitized
      const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('my-new-cms');
      expect(pkg.scripts['seed:docs:official']).toBeUndefined();
      expect(pkg.scripts['test:create']).toBeUndefined();
      expect(pkg.scripts.setup).toBe('node scripts/setup.mjs');
      expect(pkg.scripts.dev).toBeDefined();

      // Local environment files must be created
      const rootDevVars = fs.readFileSync(path.join(targetDir, '.dev.vars'), 'utf8');
      const apiDevVars = fs.readFileSync(
        path.join(targetDir, 'packages/admin-api-worker/.dev.vars'),
        'utf8'
      );
      const envDev = fs.readFileSync(path.join(targetDir, '.env.development'), 'utf8');

      expect(rootDevVars).toContain('ENVIRONMENT=dev');
      expect(apiDevVars).toContain('ENVIRONMENT=dev');
      expect(envDev).toContain('VITE_PUBLIC_SITE_URL=http://localhost:8788');
    });
  });
});
