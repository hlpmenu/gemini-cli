import type { BunPlugin } from 'bun';

const rootDir = process.cwd();

const aliasPlugin: BunPlugin = {
  name: 'monorepo-alias',
  setup(build) {
    // gemini-cli-core
    build.onResolve({ filter: /^@(google|hlmpn)\/gemini-cli-core$/ }, () => {
      return {
        path: `${rootDir}/packages/core/dist/index.js`,
        namespace: 'file',
      };
    });

    // gemini-cli-a2a-server
    build.onResolve(
      { filter: /^@(google|hlmpn)\/gemini-cli-a2a-server$/ },
      () => {
        return {
          path: `${rootDir}/packages/a2a-server/dist/index.js`,
          namespace: 'file',
        };
      },
    );
  },
};

export default aliasPlugin;
