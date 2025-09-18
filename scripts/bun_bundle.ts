/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// scripts/bun_build.ts

import aliasPlugin from './bun-plugins/resolve-subpackage-plugin';

console.log('PWD:', process.cwd());

const bundle = async (outputPath: string = 'bundle/gemini.js') => {
  console.log(`Bundling with Bun to ${outputPath}...`);

  const result = await Bun.build({
    entrypoints: ['packages/cli/index.ts'],
    target: 'bun',
    sourcemap: false,
    minify: {
      whitespace: true,
      identifiers: true,
      syntax: true,
      keepNames: false,
    },
    plugins: [aliasPlugin],
    tsconfig: 'packages/cli/tsconfig.json',
  });

  if (!result.success) {
    console.error('Bun build failed:');
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }
  // Get the first (and only) output file
  const output = result.outputs[0];

  // Write it exactly where you want it
  await Bun.write('bundle/gemini.js', output);

  console.log('Bun build complete!');
};

async function main() {
  let outputPath = 'bundle/gemini.js';
  const outputFlagIndex = process.argv.indexOf('--output');
  if (
    outputFlagIndex > 0 &&
    process.argv[outputFlagIndex + 1] &&
    !process.argv[outputFlagIndex + 1].startsWith('--')
  ) {
    outputPath = process.argv[outputFlagIndex + 1];
  }
  await bundle(outputPath);
}

if (import.meta.main) {
  main();
}

export default bundle;
