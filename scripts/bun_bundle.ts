// scripts/bun_build.ts
console.log('PWD:', process.cwd());

async function bundle(outputPath: string = 'bundle/gemini.js') {
  console.log(`Bundling with Bun to ${outputPath}...`);

  const result = await Bun.build({
    entrypoints: ['packages/cli/index.ts'],
    outfile: outputPath,
    target: 'bun',
    write: true,
    minify: true,
    sourcemap: false,
    alias: {
      // yargs uses a CJS/ESM setup that can be tricky for bundlers.
      // This alias ensures we get the correct module.
      yargs: 'yargs/yargs',
    },
  });

  if (!result.success) {
    console.error('Bun build failed:');
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  console.log('Bun build complete!');
}

async function main() {
  let outputPath = 'bundle/gemini.js';
  const outputFlagIndex = process.argv.indexOf('--output');
  if (outputFlagIndex > 0 && process.argv[outputFlagIndex + 1] && !process.argv[outputFlagIndex + 1].startsWith('--')) {
    outputPath = process.argv[outputFlagIndex + 1];
  }
  await bundle(outputPath);
}

if (import.meta.main) {
  main();
}

export default bundle;
