import { execSync } from 'child_process';
import bundle from './bun_bundle';

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
        'Skipping sandbox build (BUILD_SANDBOX environment variable is not set to "1" or "true").'
      );
    }
  } catch (error) {
    // The error from sandbox_command.js is descriptive enough.
    console.log('Skipping sandbox build (sandbox container command not found).');
  }
}

/**
 * Builds the VSCode companion extension.
 */
async function buildVscodeCompanion() {
  console.log('Building VSCode companion...');
  execSync('node scripts/build_vscode_companion.js', { stdio: 'inherit' });
}

/**
 * Main build process execution.
 */
async function main() {
  const args = process.argv.slice(2);
  const outputPath = args.includes('--output')
    ? args[args.indexOf('--output') + 1]
    : 'bundle/gemini.js';

  const buildVscode = args.includes('--build-vscode');
  const bundleOnly = args.includes('--bundle');
  const buildSandboxOnly = args.includes('--build-sandbox');

  const specificTaskRequested = buildVscode || bundleOnly || buildSandboxOnly;

  try {
    if (bundleOnly) {
      await bundleCli(outputPath);
    } else if (buildVscode) {
      await buildVscodeCompanion();
    } else if (buildSandboxOnly) {
      await buildSandbox();
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