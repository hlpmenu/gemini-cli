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
const aliasPlugin = {
  name: 'alias-resolver',
  setup(builder) {
    builder.onResolve(
      { filter: /^@google\/gemini-cli-core(\/.*)?$/ },
      async (args) => {
        // e.g. map to the local src directory
        const pathSuffix = args.path.replace(/^@google\/gemini-cli-core/, '');
        const resolved = `../../core/src${pathSuffix}`; // adjust relative as needed
        return {
          path: new URL(resolved, import.meta.url).pathname,
        };
      },
    );
  },
};

const buildWithBun = async () => {
  const production = process.argv.includes('--production');
  const watch = process.argv.includes('--watch');

  // Simple plugin to mimic the ProblemMatcher
  const problemMatcherPlugin = {
    name: 'bun-problem-matcher',
    setup(build) {
      // Bun doesn’t support all esbuild hooks; for example, onStart/onEnd might not work.
      // We include only hooks that are supported or workaround.
      build.onLoad({ filter: /.*/ }, async (args) => {
        // no-op: placeholder or you can wrap this to track errors/logs
        return null;
      });
    },
  };

  const result = await Bun.build({
    entrypoints: ['src/extension.ts'],
    outdir: 'packages/vscode-ide-companion/dist',
    format: 'cjs',
    target: 'node',
    minify: production,
    sourcemap: !production,
    external: ['vscode'],
    banner:
      "const import_meta = { url: require('url').pathToFileURL(__filename).href };",

    define: {
      'import.meta.url': 'import_meta.url',
    },
    tsconfig: 'tsconfig.json',
    plugins: [problemMatcherPlugin],
    loader: { '.node': 'file' },
    watch: watch ? true : undefined,
    root: '.',
    alias: {
      '@google/gemini-cli-core': '../core/src',
    },
    conditions: ['node'], // try adding this
  });

  if (!result.success) {
    console.error('⚠️ Bun.build failed:', result.logs);
    process.exit(1);
  }
};

const main = async () => {
  try {
    if (Bun) {
      buildWithBun();
      return;
    }
  } catch (e) {
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
