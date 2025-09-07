import { execSync } from 'child_process';
import bundle from './bun_build.js';

const outputPath = process.argv.includes('--output')
  ? process.argv[process.argv.indexOf('--output') + 1]
  : 'bundle/gemini.js';

(async () => {
  try {
    console.log('Generating git commit info...');
    execSync('bun scripts/generate-git-commit-info.js', { stdio: 'inherit' });

    await bundle(outputPath);

    console.log('Copying bundle assets...');
    execSync('bun scripts/copy_bundle_assets.js', { stdio: 'inherit' });

    console.log('Building sandbox...');
    execSync('bun scripts/build_sandbox.js --skip-npm-install-build', { stdio: 'inherit' });

    console.log('Building VSCode companion...');
    execSync('node scripts/build_vscode_companion.js', { stdio: 'inherit' });

    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
})();