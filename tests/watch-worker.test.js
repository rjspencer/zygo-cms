import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isRelevantFile,
  getWatchTargets,
  createWorkerWatcher,
} from '../scripts/watch-worker.mjs';

describe('scripts/watch-worker.mjs', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zygo-watch-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe('isRelevantFile', () => {
    it('returns true for .rs and .toml files', () => {
      expect(isRelevantFile('src/lib.rs')).toBe(true);
      expect(isRelevantFile('handlers/admin.rs')).toBe(true);
      expect(isRelevantFile('Cargo.toml')).toBe(true);
    });

    it('returns false for non-rust/toml files', () => {
      expect(isRelevantFile('style.css')).toBe(false);
      expect(isRelevantFile('index.js')).toBe(false);
      expect(isRelevantFile('README.md')).toBe(false);
      expect(isRelevantFile(null)).toBe(false);
      expect(isRelevantFile('')).toBe(false);
    });

    it('ignores target, build, and git paths', () => {
      expect(isRelevantFile('target/wasm32/lib.rs')).toBe(false);
      expect(isRelevantFile('build/index.js')).toBe(false);
      expect(isRelevantFile('.git/config')).toBe(false);
      expect(isRelevantFile('node_modules/pkg/lib.rs')).toBe(false);
    });
  });

  describe('getWatchTargets', () => {
    it('resolves correct paths for admin-api-worker', () => {
      const { workerDir, workerName, targets } = getWatchTargets(tmpRoot, 'packages/admin-api-worker');
      expect(workerName).toBe('admin-api-worker');
      expect(workerDir).toBe(path.join(tmpRoot, 'packages/admin-api-worker'));
      expect(targets).toHaveLength(4);
      expect(targets[0]).toBe(path.join(tmpRoot, 'packages/admin-api-worker/src'));
      expect(targets[1]).toBe(path.join(tmpRoot, 'packages/admin-api-worker/Cargo.toml'));
      expect(targets[2]).toBe(path.join(tmpRoot, 'packages/core/src'));
      expect(targets[3]).toBe(path.join(tmpRoot, 'packages/core/Cargo.toml'));
    });
  });

  describe('createWorkerWatcher', () => {
    it('returns null if workerDir does not exist', () => {
      const errorLog = vi.fn();
      const watcher = createWorkerWatcher({
        rootDir: tmpRoot,
        targetWorker: 'non-existent',
        logError: errorLog,
      });
      expect(watcher).toBeNull();
      expect(errorLog).toHaveBeenCalled();
    });

    it('sets up watchers and triggers build on changes', async () => {
      const workerSrc = path.join(tmpRoot, 'packages/admin-api-worker/src');
      fs.mkdirSync(workerSrc, { recursive: true });
      fs.writeFileSync(path.join(tmpRoot, 'packages/admin-api-worker/Cargo.toml'), '[package]');

      const coreSrc = path.join(tmpRoot, 'packages/core/src');
      fs.mkdirSync(coreSrc, { recursive: true });

      const fakeSpawn = vi.fn().mockImplementation(() => {
        const listeners = {};
        return {
          on: (event, cb) => {
            listeners[event] = cb;
            if (event === 'close') {
              setTimeout(() => cb(0), 10);
            }
          },
        };
      });

      const log = vi.fn();
      const watcher = createWorkerWatcher({
        rootDir: tmpRoot,
        targetWorker: 'packages/admin-api-worker',
        debounceMs: 50,
        spawnFn: fakeSpawn,
        log,
      });

      expect(watcher).not.toBeNull();

      // Trigger a build
      watcher.triggerBuild(path.join(workerSrc, 'lib.rs'));

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fakeSpawn).toHaveBeenCalledWith(
        'worker-build',
        ['--release'],
        expect.objectContaining({
          cwd: path.join(tmpRoot, 'packages/admin-api-worker'),
        })
      );

      watcher.close();
    });
  });
});
