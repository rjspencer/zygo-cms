import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PREBUILT_ARTIFACTS,
  parseArgs,
  checkPrebuiltArtifacts,
  checkRustToolchain,
  runBuild,
  printHelp,
} from '../scripts/build.mjs';

describe('scripts/build.mjs — Smart Build Runner', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zygo-build-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe('parseArgs', () => {
    it('returns default options when no arguments are provided', () => {
      const opts = parseArgs([]);
      expect(opts).toEqual({
        forceRust: false,
        skipRust: false,
        help: false,
      });
    });

    it('parses --force-rust, --skip-rust, and help flags', () => {
      expect(parseArgs(['--force-rust'])).toEqual({
        forceRust: true,
        skipRust: false,
        help: false,
      });

      expect(parseArgs(['--skip-rust'])).toEqual({
        forceRust: false,
        skipRust: true,
        help: false,
      });

      expect(parseArgs(['-h'])).toEqual({
        forceRust: false,
        skipRust: false,
        help: true,
      });

      expect(parseArgs(['--help'])).toEqual({
        forceRust: false,
        skipRust: false,
        help: true,
      });
    });
  });

  describe('checkPrebuiltArtifacts', () => {
    it('returns allExist: false when required artifacts are missing', () => {
      const result = checkPrebuiltArtifacts(tmpRoot);
      expect(result.allExist).toBe(false);
      expect(result.missing).toEqual([
        'packages/public-worker/build/index.js',
        'packages/admin-api-worker/build/index.js',
        'packages/template-wasm/pkg/template_wasm.js',
      ]);
      expect(result.artifacts['packages/public-worker/build/index.js']).toBe(false);
    });

    it('returns allExist: false when only some artifacts exist', () => {
      const pubWorkerPath = path.join(tmpRoot, 'packages/public-worker/build');
      fs.mkdirSync(pubWorkerPath, { recursive: true });
      fs.writeFileSync(path.join(pubWorkerPath, 'index.js'), '// worker');

      const result = checkPrebuiltArtifacts(tmpRoot);
      expect(result.allExist).toBe(false);
      expect(result.artifacts['packages/public-worker/build/index.js']).toBe(true);
      expect(result.artifacts['packages/admin-api-worker/build/index.js']).toBe(false);
      expect(result.artifacts['packages/template-wasm/pkg/template_wasm.js']).toBe(false);
      expect(result.missing).toHaveLength(2);
    });

    it('returns allExist: true when all 3 pre-built artifacts exist', () => {
      for (const relPath of PREBUILT_ARTIFACTS) {
        const full = path.join(tmpRoot, relPath);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, '// built artifact');
      }

      const result = checkPrebuiltArtifacts(tmpRoot);
      expect(result.allExist).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.artifacts['packages/public-worker/build/index.js']).toBe(true);
      expect(result.artifacts['packages/admin-api-worker/build/index.js']).toBe(true);
      expect(result.artifacts['packages/template-wasm/pkg/template_wasm.js']).toBe(true);
    });
  });

  describe('checkRustToolchain', () => {
    it('returns available: true when cargo, worker-build, and wasm-pack commands succeed', () => {
      const execSyncFn = vi.fn((cmd) => {
        if (cmd === 'cargo --version') return Buffer.from('cargo 1.80.0');
        if (cmd === 'worker-build --version') return Buffer.from('worker-build 0.2.0');
        if (cmd === 'wasm-pack --version') return Buffer.from('wasm-pack 0.13.0');
        throw new Error(`Unexpected command: ${cmd}`);
      });

      const result = checkRustToolchain(execSyncFn);
      expect(result).toEqual({
        cargo: true,
        workerBuild: true,
        wasmPack: true,
        available: true,
      });
      expect(execSyncFn).toHaveBeenCalledWith('cargo --version', { stdio: 'ignore' });
      expect(execSyncFn).toHaveBeenCalledWith('worker-build --version', { stdio: 'ignore' });
      expect(execSyncFn).toHaveBeenCalledWith('wasm-pack --version', { stdio: 'ignore' });
    });

    it('returns available: false when cargo is missing', () => {
      const execSyncFn = vi.fn((cmd) => {
        if (cmd === 'cargo --version') throw new Error('command not found: cargo');
        if (cmd === 'worker-build --version') return Buffer.from('worker-build 0.2.0');
        if (cmd === 'wasm-pack --version') return Buffer.from('wasm-pack 0.13.0');
      });

      const result = checkRustToolchain(execSyncFn);
      expect(result).toEqual({
        cargo: false,
        workerBuild: true,
        wasmPack: true,
        available: false,
      });
    });

    it('returns available: false when worker-build is missing', () => {
      const execSyncFn = vi.fn((cmd) => {
        if (cmd === 'cargo --version') return Buffer.from('cargo 1.80.0');
        if (cmd === 'worker-build --version') throw new Error('command not found: worker-build');
        if (cmd === 'wasm-pack --version') return Buffer.from('wasm-pack 0.13.0');
      });

      const result = checkRustToolchain(execSyncFn);
      expect(result).toEqual({
        cargo: true,
        workerBuild: false,
        wasmPack: true,
        available: false,
      });
    });

    it('returns available: false when wasm-pack is missing', () => {
      const execSyncFn = vi.fn((cmd) => {
        if (cmd === 'cargo --version') return Buffer.from('cargo 1.80.0');
        if (cmd === 'worker-build --version') return Buffer.from('worker-build 0.2.0');
        if (cmd === 'wasm-pack --version') throw new Error('command not found: wasm-pack');
      });

      const result = checkRustToolchain(execSyncFn);
      expect(result).toEqual({
        cargo: true,
        workerBuild: true,
        wasmPack: false,
        available: false,
      });
    });

    it('returns available: false when all tools fail', () => {
      const execSyncFn = vi.fn(() => {
        throw new Error('command not found');
      });

      const result = checkRustToolchain(execSyncFn);
      expect(result).toEqual({
        cargo: false,
        workerBuild: false,
        wasmPack: false,
        available: false,
      });
    });
  });

  describe('runBuild execution scenarios', () => {
    const mockLog = vi.fn();

    it('Case 1: when pre-built Wasm exists and cargo/worker-build are not installed, builds UI and skips Rust', () => {
      const calls = [];
      const execFn = vi.fn((cmd) => calls.push(cmd));

      runBuild(
        {},
        {
          artifacts: { allExist: true, missing: [], artifacts: {} },
          toolchain: { cargo: false, workerBuild: false, wasmPack: false, available: false },
          execFn,
          log: mockLog,
        }
      );

      expect(calls).toEqual(['pnpm run build:ui']);
      expect(calls).not.toContain('pnpm run build:rust');
    });

    it('Case 1 (default with toolchain): when pre-built Wasm exists and toolchain IS available, still defaults to using pre-compiled Wasm unless --force-rust is passed', () => {
      const calls = [];
      const execFn = vi.fn((cmd) => calls.push(cmd));

      runBuild(
        {},
        {
          artifacts: { allExist: true, missing: [], artifacts: {} },
          toolchain: { cargo: true, workerBuild: true, wasmPack: true, available: true },
          execFn,
          log: mockLog,
        }
      );

      expect(calls).toEqual(['pnpm run build:ui']);
      expect(calls).not.toContain('pnpm run build:rust');
    });

    it('Case 1 (variant): when pre-built Wasm exists and --skip-rust is passed, skips Rust even if toolchain is available', () => {
      const calls = [];
      const execFn = vi.fn((cmd) => calls.push(cmd));

      runBuild(
        { skipRust: true },
        {
          artifacts: { allExist: true, missing: [], artifacts: {} },
          toolchain: { cargo: true, workerBuild: true, wasmPack: true, available: true },
          execFn,
          log: mockLog,
        }
      );

      expect(calls).toEqual(['pnpm run build:ui']);
      expect(calls).not.toContain('pnpm run build:rust');
    });

    it('Case 2: when --force-rust is passed and cargo/worker-build are available, compiles Rust then builds UI', () => {
      const calls = [];
      const execFn = vi.fn((cmd) => calls.push(cmd));

      runBuild(
        { forceRust: true },
        {
          artifacts: { allExist: true, missing: [], artifacts: {} },
          toolchain: { cargo: true, workerBuild: true, wasmPack: true, available: true },
          execFn,
          log: mockLog,
        }
      );

      expect(calls).toEqual(['pnpm run build:rust', 'pnpm run build:ui']);
    });

    it('Case 2 (error): when --force-rust is passed but toolchain is unavailable, throws descriptive error', () => {
      const execFn = vi.fn();

      expect(() =>
        runBuild(
          { forceRust: true },
          {
            artifacts: { allExist: true, missing: [], artifacts: {} },
            toolchain: { cargo: false, workerBuild: true, wasmPack: true, available: false },
            execFn,
            log: mockLog,
          }
        )
      ).toThrow(/Rust, worker-build, and wasm-pack are required when --force-rust is specified/i);

      expect(execFn).not.toHaveBeenCalled();
    });

    it('Case 3: when pre-built Wasm files are missing and cargo is unavailable, throws descriptive error with release branch instruction', () => {
      const execFn = vi.fn();

      expect(() =>
        runBuild(
          {},
          {
            artifacts: {
              allExist: false,
              missing: ['packages/public-worker/build/index.js'],
              artifacts: {},
            },
            toolchain: { cargo: false, workerBuild: false, available: false },
            execFn,
            log: mockLog,
          }
        )
      ).toThrow(/release/i);

      expect(() =>
        runBuild(
          {},
          {
            artifacts: {
              allExist: false,
              missing: ['packages/public-worker/build/index.js'],
              artifacts: {},
            },
            toolchain: { cargo: false, workerBuild: false, available: false },
            execFn,
            log: mockLog,
          }
        )
      ).toThrow(/install Rust/i);

      expect(execFn).not.toHaveBeenCalled();
    });

    it('Case 4: when pre-built Wasm files are missing but cargo and worker-build are available, compiles Rust then builds UI', () => {
      const calls = [];
      const execFn = vi.fn((cmd) => calls.push(cmd));

      runBuild(
        {},
        {
          artifacts: {
            allExist: false,
            missing: ['packages/public-worker/build/index.js'],
            artifacts: {},
          },
          toolchain: { cargo: true, workerBuild: true, available: true },
          execFn,
          log: mockLog,
        }
      );

      expect(calls).toEqual(['pnpm run build:rust', 'pnpm run build:ui']);
    });

    it('throws error when mutually exclusive --force-rust and --skip-rust flags are passed', () => {
      expect(() =>
        runBuild({ forceRust: true, skipRust: true }, { log: mockLog })
      ).toThrow(/Cannot specify both --force-rust and --skip-rust/i);
    });

    it('prints help message when help option is provided', () => {
      const logged = [];
      const log = vi.fn((msg) => logged.push(msg));

      runBuild({ help: true }, { log });
      expect(logged.length).toBeGreaterThan(0);
      expect(logged[0]).toContain('zygo-build');
    });

    it('end-to-end with real filesystem artifacts detection in rootDir', () => {
      // Create all artifacts on disk in tmpRoot
      for (const relPath of PREBUILT_ARTIFACTS) {
        const full = path.join(tmpRoot, relPath);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, '// prebuilt');
      }

      const calls = [];
      const execFn = vi.fn((cmd) => {
        calls.push(cmd);
        if (cmd === 'cargo --version' || cmd === 'worker-build --version') {
          throw new Error('not installed');
        }
      });

      runBuild({}, { rootDir: tmpRoot, execFn, log: mockLog });

      // Because pre-built artifacts exist on disk and --force-rust was not passed, it builds UI directly
      expect(calls).toEqual([
        'pnpm run build:ui',
      ]);
    });
  });
});
