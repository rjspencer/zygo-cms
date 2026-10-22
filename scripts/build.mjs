#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';

export const PREBUILT_ARTIFACTS = [
  'packages/public-worker/build/index.js',
  'packages/admin-api-worker/build/index.js',
  'packages/template-wasm/pkg/template_wasm.js',
];

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    forceRust: false,
    skipRust: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '--force-rust') {
      options.forceRust = true;
    } else if (arg === '--skip-rust') {
      options.skipRust = true;
    }
  }

  return options;
}

export function checkPrebuiltArtifacts(rootDir = process.cwd()) {
  const results = {};
  const missing = [];

  for (const relPath of PREBUILT_ARTIFACTS) {
    const fullPath = path.resolve(rootDir, relPath);
    const exists = fs.existsSync(fullPath);
    results[relPath] = exists;
    if (!exists) {
      missing.push(relPath);
    }
  }

  return {
    allExist: missing.length === 0,
    missing,
    artifacts: results,
  };
}

export function checkRustToolchain(execSyncFn = execSync) {
  let cargo = false;
  let workerBuild = false;
  let wasmPack = false;

  try {
    execSyncFn('cargo --version', { stdio: 'ignore' });
    cargo = true;
  } catch (_) {}

  try {
    execSyncFn('worker-build --version', { stdio: 'ignore' });
    workerBuild = true;
  } catch (_) {}

  try {
    execSyncFn('wasm-pack --version', { stdio: 'ignore' });
    wasmPack = true;
  } catch (_) {}

  return {
    cargo,
    workerBuild,
    wasmPack,
    available: cargo && workerBuild && wasmPack,
  };
}

export function printHelp(log = console.log) {
  log(`
${pc.bold(pc.cyan('zygo-build'))} — Smart build runner for Zygo CMS

${pc.bold('Usage:')}
  node scripts/build.mjs [options]
  pnpm run build [options]

${pc.bold('Options:')}
  --force-rust    Force compilation of Rust Wasm workers from source
  --skip-rust     Skip Rust compilation and use pre-compiled Wasm bundles
  -h, --help      Display this help message
`);
}

export function runBuild(options = {}, context = {}) {
  const {
    rootDir = process.cwd(),
    execFn = execSync,
    log = console.log,
  } = context;

  if (options.help) {
    printHelp(log);
    return;
  }

  if (options.forceRust && options.skipRust) {
    throw new Error('Cannot specify both --force-rust and --skip-rust');
  }

  const artifacts = context.artifacts || checkPrebuiltArtifacts(rootDir);

  if (artifacts.allExist && !options.forceRust) {
    log(pc.green('✓ Using pre-compiled Rust Wasm bundles. Skipping Rust compilation.'));
    log(pc.cyan('⚡ Building Admin UI...'));
    execFn('pnpm run build:ui', { cwd: rootDir, stdio: 'inherit' });
    log(pc.green('✓ Build completed successfully.'));
    return;
  }

  const toolchain = context.toolchain || checkRustToolchain(execFn);

  if (options.forceRust) {
    if (!toolchain.available) {
      const missingTools = [];
      if (!toolchain.cargo) missingTools.push('cargo (Rust)');
      if (!toolchain.workerBuild) missingTools.push('worker-build');
      if (!toolchain.wasmPack) missingTools.push('wasm-pack');
      throw new Error(
        `Rust, worker-build, and wasm-pack are required when --force-rust is specified, but missing: ${missingTools.join(', ')}. Please install the Rust toolchain to compile from source.`
      );
    }
    log(pc.cyan('⚡ Compiling Rust Wasm workers from source (--force-rust)...'));
    execFn('pnpm run build:rust', { cwd: rootDir, stdio: 'inherit' });
    log(pc.cyan('⚡ Building Admin UI...'));
    execFn('pnpm run build:ui', { cwd: rootDir, stdio: 'inherit' });
    log(pc.green('✓ Build completed successfully.'));
    return;
  }

  // At least one artifact is missing
  if (toolchain.available && !options.skipRust) {
    log(pc.yellow('⚠ Pre-compiled Wasm artifacts are missing. Compiling from source...'));
    execFn('pnpm run build:rust', { cwd: rootDir, stdio: 'inherit' });
    log(pc.cyan('⚡ Building Admin UI...'));
    execFn('pnpm run build:ui', { cwd: rootDir, stdio: 'inherit' });
    log(pc.green('✓ Build completed successfully.'));
    return;
  }

  throw new Error(
    "Pre-compiled Wasm artifacts are missing and Rust/worker-build/wasm-pack toolchain is not found. To build from source, install Rust, worker-build, and wasm-pack, or checkout the 'release' branch which includes pre-compiled artifacts."
  );
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }
  try {
    runBuild(options);
  } catch (err) {
    console.error(pc.red(`Error: ${err.message}`));
    process.exit(1);
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main();
}
