/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import { $ } from 'bun';
import bundle from './bun_bundle';

const outputPath = process.argv.includes('--output')
  ? process.argv[process.argv.indexOf('--output') + 1]
  : 'bundle/gemini.js';

/**
 * Bundles the CLI application.
 */
async function bundleCli(outputPath: string) {
  console.log('Generating git commit info...');
  execSync('bun scripts/generate-git-commit-info.js', { stdio: 'inherit' });

  await bundle(outputPath);

  console.log('Copying bundle assets...');
  execSync('bun scripts/copy_bundle_assets.js', { stdio: 'inherit' });
}

/**
 * Builds the sandbox container if the environment is configured for it.
 */
async function buildSandbox() {
  console.log('Checking for sandbox container command...');
  try {
    // First, check if the sandbox command is available. This will throw if not.
    execSync('bun scripts/sandbox_command.js -q', { stdio: 'inherit' });

    // Only build the sandbox if the command is present and the env var is set.
    if (
      process.env.BUILD_SANDBOX === '1' ||
      process.env.BUILD_SANDBOX === 'true'
    ) {
      console.log('Building sandbox...');
      execSync('bun scripts/build_sandbox.js --skip-npm-install-build', {
        stdio: 'inherit',
      });
    } else {
      console.log(
        'Skipping sandbox build (BUILD_SANDBOX environment variable is not set to "1" or "true").',
      );
    }
  } catch (error) {
    // The error from sandbox_command.js is descriptive enough.
    console.log(
      'Skipping sandbox build (sandbox container command not found).',
    );
  }
}

/**
 * Builds the VSCode companion extension.
 */
const buildVscodeCompanion = async () => {
  console.log('Building VSCode companion...');

  const vscodeDir = new URL(
    '../packages/vscode-ide-companion/',
    import.meta.url,
  ).pathname;

  const proc = Bun.spawnSync({
    cmd: ['bun', 'run', 'package'], // runs the "package" script in that workspace
    cwd: vscodeDir,
    stdout: 'inherit',
    stderr: 'inherit',
    env: Bun.env,
  });

  if (proc.exitCode !== 0) {
    throw new Error(
      `VSCode companion build failed with exit code ${proc.exitCode}`,
    );
  }
};

const buildPackage = async () => {
  if (!process.cwd().includes('packages')) {
    console.error('must be invoked from a package directory');
    process.exit(1);
  }

  if (typeof Bun === 'undefined') {
    try {
      execSync('node scripts/build_package.js', { stdio: 'inherit' });
      return;
    } catch (e) {
      console.error('Error building package:', e);
      process.exit(1);
    }
  }

  try {
    // 1. Run type-checks only
    // This will now be caught by the catch block on failure.

    await $`bunx --bun tsgo -p ./tsconfig.json --noEmit`;

    // 2. Bundle sources with Bun (TS + TSX supported)
    const result = await Bun.build({
      entrypoints: ['index.ts'],
      outdir: 'dist',
      target: 'bun',
      sourcemap: 'none',
    });

    if (!result.success) {
      console.error('Bun.build failed:', result.logs);
      // Throw an error to be handled by the main catch block.
      throw new Error('Bun build step failed.');
    }

    // 3. Copy over static files (.md, .json)
    try {
      const copyResult = await $`bun ../../scripts/copy_files.js`;

      if (copyResult.exitCode !== 0) {
        throw new Error(copyResult.text());
      }
    } catch (e) {
      if (e instanceof $.ShellError) {
        throw new Error(`${e.stderr} ${e.stdout}`);
      }
      throw e;
    }

    // 4. Touch dist/.last_build
    await Bun.write(`${process.cwd()}/dist/.last_build`, '');

    console.log('✅ build complete');
  } catch (e) {
    // Catches errors from tsc, copy_files, or a failed Bun.build
    console.error('❌ Build process failed.');

    // Bun's ShellError provides rich context (stdout/stderr), which is useful for debugging.
    // We log the error itself for this reason.
    if (e instanceof $.ShellError) {
      console.error(e.stdout.toString());
      console.error(e.stderr.toString());
    } else {
      console.error(e);
    }

    process.exit(1);
  }
};

/**
 * Main build process execution.
 */
async function main() {
  const args = process.argv.slice(2);

  const runBuildPackage = args.includes('--build-package');
  const buildVscode = args.includes('--build-vscode');
  const bundleOnly = args.includes('--bundle');
  const buildSandboxOnly = args.includes('--build-sandbox');

  const specificTaskRequested =
    buildVscode || bundleOnly || buildSandboxOnly || runBuildPackage;

  try {
    if (bundleOnly) {
      await bundleCli(outputPath);
    } else if (buildVscode) {
      await buildVscodeCompanion();
    } else if (buildSandboxOnly) {
      await buildSandbox();
    } else if (runBuildPackage) {
      await buildPackage();
    }

    // If no specific task was requested, run the full build.
    if (!specificTaskRequested) {
      await bundleCli(outputPath);
      await buildSandbox();
      await buildVscodeCompanion();
    }

    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();
