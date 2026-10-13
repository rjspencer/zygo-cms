#!/usr/bin/env node

/**
 * create-component-module.mjs
 * 
 * Scaffolds a modular React component folder structure matching Zygo CMS conventions:
 * 
 * <targetDir>/<ComponentName>/
 * ├── <ComponentName>.tsx          (main component)
 * ├── <ComponentName>.test.tsx     (unit/integration test)
 * ├── <ComponentName>.stories.tsx  (storybook stories)
 * ├── types.ts                     (TypeScript interfaces & types)
 * ├── index.ts                     (barrel export)
 * ├── components/                  (local subcomponents)
 * └── hooks/                       (local custom hooks)
 * 
 * Leaves files empty as requested for clean refactoring.
 * 
 * Usage:
 *   node scripts/create-component-module.mjs <ComponentName> [targetDir]
 *   node scripts/create-component-module.mjs packages/admin-ui/src/components/MyComponent
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find workspace root by walking up from the script's directory
function findRepoRoot(startDir) {
  let curr = startDir;
  while (curr !== path.dirname(curr)) {
    if (
      fs.existsSync(path.join(curr, 'pnpm-workspace.yaml')) ||
      fs.existsSync(path.join(curr, '.git'))
    ) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return path.resolve(__dirname, '..');
}

const repoRoot = findRepoRoot(__dirname);
const defaultComponentsBase = path.join(repoRoot, 'packages/admin-ui/src/components');

function printUsage() {
  console.log(`
Usage:
  node scripts/create-component-module.mjs <ComponentName> [targetDir] [options]

Arguments:
  <ComponentName>   Name of the component (e.g., "MediaPickerModal" or "EditorHeader")
                    Can also be a relative or absolute path (e.g., "packages/admin-ui/src/components/MediaPickerModal.tsx")
  [targetDir]       Optional target directory. Defaults to "packages/admin-ui/src/components/<ComponentName>"

Options:
  --from, -f <file> Optionally move/copy code from an existing component file into <ComponentName>.tsx
  --help, -h        Show this help message

Created Structure:
  <targetDir>/
  ├── <ComponentName>.tsx
  ├── <ComponentName>.test.tsx
  ├── <ComponentName>.stories.tsx
  ├── types.ts
  ├── index.ts
  ├── components/
  └── hooks/
`);
}

function parseArgs(args) {
  let rawName = null;
  let customTargetDir = null;
  let sourceFile = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg === '--from' || arg === '-f') {
      sourceFile = args[++i];
    } else if (arg.startsWith('--from=')) {
      sourceFile = arg.split('=')[1];
    } else if (!rawName) {
      rawName = arg;
    } else if (!customTargetDir) {
      customTargetDir = arg;
    }
  }

  return { rawName, customTargetDir, sourceFile };
}

function resolveComponentNameAndTarget(rawName, customTargetDir) {
  if (!rawName) {
    console.error('Error: Missing component name.');
    printUsage();
    process.exit(1);
  }

  // Normalize path if a file or directory path was provided
  const normalized = rawName.trim().replace(/[\\/]+$/, '');
  const parsed = path.parse(normalized);

  // If path was like "Foo.tsx" or "path/to/Foo.tsx", strip .tsx / .ts / .jsx / .js
  let componentName = parsed.name;
  if (['.tsx', '.ts', '.jsx', '.js'].includes(parsed.ext)) {
    componentName = parsed.name;
  } else if (!parsed.ext) {
    componentName = parsed.base;
  }

  // Validate component name (PascalCase recommended)
  if (!/^[A-Za-z0-9_-]+$/.test(componentName)) {
    console.error(`Error: Invalid component name "${componentName}". Use alphanumeric characters.`);
    process.exit(1);
  }

  let targetDir;
  if (customTargetDir) {
    // If targetDir was explicitly given
    const resolvedCustom = path.isAbsolute(customTargetDir)
      ? customTargetDir
      : path.resolve(process.cwd(), customTargetDir);

    // If customTargetDir ends with the component name, use it; otherwise append componentName
    if (path.basename(resolvedCustom) === componentName) {
      targetDir = resolvedCustom;
    } else {
      targetDir = path.join(resolvedCustom, componentName);
    }
  } else if (parsed.dir && parsed.dir !== '.') {
    // rawName included directory path (e.g., packages/admin-ui/src/components/MyComponent.tsx)
    const resolvedDir = path.isAbsolute(parsed.dir)
      ? parsed.dir
      : path.resolve(process.cwd(), parsed.dir);

    if (path.basename(resolvedDir) === componentName) {
      targetDir = resolvedDir;
    } else {
      targetDir = path.join(resolvedDir, componentName);
    }
  } else {
    // Default to packages/admin-ui/src/components/<ComponentName>
    targetDir = path.join(defaultComponentsBase, componentName);
  }

  return { componentName, targetDir };
}

function main() {
  const { rawName, customTargetDir, sourceFile } = parseArgs(process.argv.slice(2));
  const { componentName, targetDir } = resolveComponentNameAndTarget(rawName, customTargetDir);

  const relTargetDir = path.relative(repoRoot, targetDir);
  console.log(`\nCreating React component module "${componentName}" in ${relTargetDir}...\n`);

  // Ensure root component directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`  [dir]  Created directory: ${relTargetDir}`);
  } else {
    console.log(`  [dir]  Directory already exists: ${relTargetDir}`);
  }

  // Common subfolders
  const subdirs = ['components', 'hooks'];
  for (const subdir of subdirs) {
    const subdirPath = path.join(targetDir, subdir);
    const relSubdir = path.relative(repoRoot, subdirPath);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
      console.log(`  [dir]  Created directory: ${relSubdir}`);
    } else {
      console.log(`  [dir]  Subdirectory already exists: ${relSubdir}`);
    }
  }

  // Main files to create (left empty as requested)
  const files = [
    `${componentName}.tsx`,
    `${componentName}.test.tsx`,
    `${componentName}.stories.tsx`,
    'types.ts',
    'index.ts',
  ];

  for (const file of files) {
    const filePath = path.join(targetDir, file);
    const relFile = path.relative(repoRoot, filePath);

    if (fs.existsSync(filePath)) {
      console.log(`  [file] Skipped (already exists): ${relFile}`);
      continue;
    }

    // If sourceFile was provided and this is the main component file, populate it
    let initialContent = '';
    if (file === `${componentName}.tsx` && sourceFile) {
      const resolvedSource = path.isAbsolute(sourceFile)
        ? sourceFile
        : path.resolve(process.cwd(), sourceFile);
      if (fs.existsSync(resolvedSource)) {
        initialContent = fs.readFileSync(resolvedSource, 'utf8');
        console.log(`  [file] Populated from source: ${path.relative(repoRoot, resolvedSource)}`);
      } else {
        console.warn(`  [warn] Source file not found: ${resolvedSource}. Leaving empty.`);
      }
    }

    fs.writeFileSync(filePath, initialContent, 'utf8');
    console.log(`  [file] Created file: ${relFile}`);
  }

  console.log(`\nComponent module "${componentName}" successfully scaffolded!`);
  console.log(`Next steps:`);
  console.log(`  1. Move/extract code into ${componentName}.tsx, types.ts, and index.ts`);
  console.log(`  2. Decompose subcomponents into ${relTargetDir}/components/`);
  console.log(`  3. Extract logic into ${relTargetDir}/hooks/`);
  console.log(`  4. Consult the 'react-code' skill for guidelines and file length limits.\n`);
}

main();
