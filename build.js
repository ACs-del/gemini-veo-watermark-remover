import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const common = {
  bundle: true,
  sourcemap: true,
  target: 'es2022',
  logLevel: 'info',
};

const configs = [
  // Main SDK (Node.js ESM)
  {
    ...common,
    entryPoints: ['src/sdk/index.js'],
    outfile: 'dist/index.js',
    format: 'esm',
    platform: 'node',
    external: ['@ffmpeg/ffmpeg', '@ffmpeg/util', 'mp4box'],
  },
  // Browser SDK (ESM)
  {
    ...common,
    entryPoints: ['src/sdk/browser.js'],
    outfile: 'dist/browser.js',
    format: 'esm',
    platform: 'browser',
    external: ['mp4box', 'mp4-muxer'],
  },
  // Node SDK
  {
    ...common,
    entryPoints: ['src/sdk/node.js'],
    outfile: 'dist/node.js',
    format: 'esm',
    platform: 'node',
    external: ['@ffmpeg/ffmpeg', '@ffmpeg/util', 'mp4box', 'mp4-muxer'],
  },
  // CLI
  {
    ...common,
    entryPoints: ['src/cli/vwrCli.js'],
    outfile: 'dist/cli.js',
    format: 'esm',
    platform: 'node',
    external: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
];

async function build() {
  if (isWatch) {
    const contexts = await Promise.all(configs.map(c => esbuild.context(c)));
    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log('Watching...');
  } else {
    await Promise.all(configs.map(c => esbuild.build(c)));
    console.log('Build complete.');
  }
}

build().catch((e) => { console.error(e); process.exit(1); });
