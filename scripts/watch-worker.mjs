#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import pc from 'picocolors';

export function isRelevantFile(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath);
  if (ext !== '.rs' && ext !== '.toml') return false;
  if (filePath.includes('target') || filePath.includes('build') || filePath.includes('.git') || filePath.includes('node_modules')) {
    return false;
  }
  return true;
}

export function getWatchTargets(rootDir = process.cwd(), targetWorker = 'packages/admin-api-worker') {
  const workerDir = path.resolve(rootDir, targetWorker);
  const coreDir = path.resolve(rootDir, 'packages/core');

  return {
    workerDir,
    workerName: path.basename(workerDir),
    targets: [
      path.join(workerDir, 'src'),
      path.join(workerDir, 'Cargo.toml'),
      path.join(coreDir, 'src'),
      path.join(coreDir, 'Cargo.toml'),
    ],
  };
}

export function createWorkerWatcher(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const targetWorker = options.targetWorker || 'packages/admin-api-worker';
  const debounceMs = options.debounceMs ?? 250;
  const spawnFn = options.spawnFn || spawn;
  const log = options.log || console.log;
  const logError = options.logError || console.error;

  const { workerDir, workerName, targets } = getWatchTargets(rootDir, targetWorker);

  if (!fs.existsSync(workerDir)) {
    logError(pc.red(`[watch-worker] Target directory does not exist: ${workerDir}`));
    return null;
  }

  let isBuilding = false;
  let pendingBuild = false;
  let debounceTimer = null;
  const watchers = [];

  function runBuild() {
    if (isBuilding) {
      pendingBuild = true;
      return;
    }

    isBuilding = true;
    pendingBuild = false;
    const start = Date.now();
    log(pc.cyan(`[watch-worker] 🔨 Rebuilding ${workerName}...`));

    const child = spawnFn('worker-build', ['--release'], {
      cwd: workerDir,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      isBuilding = false;
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      if (code === 0) {
        log(pc.green(`[watch-worker] ✨ Rebuilt ${workerName} in ${duration}s. Wrangler hot-reloading...`));
      } else {
        logError(pc.red(`[watch-worker] ❌ Build failed with exit code ${code} (${duration}s)`));
      }

      if (pendingBuild) {
        triggerBuild();
      }
    });

    child.on('error', (err) => {
      isBuilding = false;
      logError(pc.red(`[watch-worker] Failed to spawn worker-build: ${err.message}`));
    });
  }

  function triggerBuild(changedFile) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (changedFile) {
        log(pc.dim(`[watch-worker] Detected change in: ${path.relative(rootDir, changedFile)}`));
      }
      runBuild();
    }, debounceMs);
  }

  function watchDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename || isRelevantFile(filename)) {
          triggerBuild(filename ? path.join(dir, filename) : dir);
        }
      });
      watchers.push(watcher);
    } catch (_) {
      watchDirectoryFallback(dir);
    }
  }

  function watchDirectoryFallback(dir) {
    try {
      const watcher = fs.watch(dir, (eventType, filename) => {
        if (!filename || isRelevantFile(filename)) {
          triggerBuild(filename ? path.join(dir, filename) : dir);
        }
      });
      watchers.push(watcher);

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'target' && entry.name !== 'build') {
          watchDirectoryFallback(path.join(dir, entry.name));
        }
      }
    } catch (_) {}
  }

  function watchFile(file) {
    if (!fs.existsSync(file)) return;
    try {
      const watcher = fs.watch(file, () => {
        triggerBuild(file);
      });
      watchers.push(watcher);
    } catch (_) {}
  }

  for (const target of targets) {
    if (fs.existsSync(target)) {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        watchDirectory(target);
      } else {
        watchFile(target);
      }
    }
  }

  log(
    pc.cyan(
      `[watch-worker] 👀 Watching ${path.relative(rootDir, path.join(workerDir, 'src'))} & packages/core/src for changes.`
    )
  );

  return {
    close: () => {
      clearTimeout(debounceTimer);
      for (const watcher of watchers) {
        try {
          watcher.close();
        } catch (_) {}
      }
    },
    triggerBuild,
    runBuild,
  };
}

export function main() {
  const targetWorker = process.argv[2] || 'packages/admin-api-worker';
  createWorkerWatcher({ targetWorker });
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main();
}
