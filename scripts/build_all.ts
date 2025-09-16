import { execSync } from 'child_process';
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
const buildVscodeCompanion = async () => {
  console.log("Building VSCode companion...");

  const vscodeDir = new URL("../packages/vscode-ide-companion/", import.meta.url).pathname;

  const proc = Bun.spawnSync({
    cmd: ["bun", "run", "package"], // runs the "package" script in that workspace
    cwd: vscodeDir,
    stdout: "inherit",
    stderr: "inherit",
    env: Bun.env,
  });

  if (proc.exitCode !== 0) {
    throw new Error(`VSCode companion build failed with exit code ${proc.exitCode}`);
  }
};

 const buildPackage = async () => {


    if (!process.cwd().includes("packages")) {
      console.error("must be invoked from a package directory");
      process.exit(1);
    }

  if (typeof Bun === "undefined") {
    try {
    execSync("node scripts/build_package.js", { stdio: "inherit" });
    return;
    } catch (e) {
      console.error("Error building package:", e);
      process.exit(1);
    }
  } 


  // 1. Run type-checks only
  execSync("bunx tsc --noEmit", { stdio: "inherit" });

  // 2. Bundle sources with Bun (TS + TSX supported)
  const result = await Bun.build({
    entrypoints: ["index.ts"], // or point directly at src/index.tsx
    outdir: "dist",
    target: "bun", // adjust: "browser" / "node" depending on your package
    sourcemap: "inline",
    minify: true,
  });

  if (!result.success) {
    console.error("Bun.build failed:", result.logs);
    process.exit(1);
  }

  // 3. Copy over static files (.md, .json)
  execSync("bun ../../scripts/copy_files.js", { stdio: "inherit" });

  // 4. Touch dist/.last_build
  writeFileSync(join(process.cwd(), "dist", ".last_build"), "");
  console.log("✅ build complete");
};


/**
 * Main build process execution.
 */
async function main() {
  const args = process.argv.slice(2);

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
