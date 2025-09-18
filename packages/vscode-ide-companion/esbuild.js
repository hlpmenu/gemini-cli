/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`,
        );
      });
      console.log('[watch] build finished');
    });
  },
};

const buildWithBun = async () => {
  const production = process.argv.includes('--production');
  const watch = process.argv.includes('--watch');

  const result = await Bun.build({
    entrypoints: ['src/extension.ts'],
    outfile: 'dist/extension.cjs',
    format: 'cjs',
    target: 'node',
    minify: true,
    sourcemap: !production,
    external: ['vscode'],
    banner:
      "const import_meta = { url: require('url').pathToFileURL(__filename).href };",

    define: {
      'import.meta.url': 'import_meta.url',
    },
    tsconfig: 'tsconfig.json',
    loader: { '.node': 'file' },
    watch: watch ? true : undefined,
    root: '.',
    alias: {
      '@google/gemini-cli-core': '../core',
    },
    conditions: ['node'], // try adding this
  });

  if (!result.success) {
    console.error('⚠️ Bun.build failed:', result.logs);
    process.exit(1);
  }
  console.log(
    result.success,
    result.outputs.map((o) => o.path),
    result.logs,
    result.errors,
    result.outputs,
  );

  try {
    await Bun.write(a);
    console.log('✅ Bundled successfully');
  } catch (e) {
    console.error('❌ Bundle failed:', e);
  }
};

const main = async () => {
  try {
    if (Bun) {
      buildWithBun();
      return;
    }
  } catch {
    console.log('Bun not available, falling back to esbuild');
  }

  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.cjs',
    external: ['vscode'],
    logLevel: 'silent',
    banner: {
      js: `const import_meta = { url: require('url').pathToFileURL(__filename).href };`,
    },
    define: {
      'import.meta.url': 'import_meta.url',
    },
    plugins: [
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin,
    ],
    loader: { '.node': 'file' },
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export default main;
