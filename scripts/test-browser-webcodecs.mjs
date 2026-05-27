#!/usr/bin/env node
/**
 * Browser regression for WebCodecs video decoding + watermark pipeline.
 *
 * Requires: node build.js first, fixtures under tests/fixtures/videos/
 * Uses Playwright Chromium (npx playwright install chromium if missing).
 */

import { createServer } from 'node:http';
import { existsSync, createReadStream } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
};

const CASES = [
  {
    name: 'diamond-1080-gemini',
    fixture: '/tests/fixtures/videos/diamond-1080-gemini.mp4',
    options: { videoProfile: 'diamond' },
    expectBlob: true,
  },
  {
    name: 'legacy-720-veo3-cat',
    fixture: '/tests/fixtures/videos/legacy-720-veo3-cat.mp4',
    options: { videoProfile: 'legacy' },
    expectBlob: true,
  },
  {
    name: 'diamond-720-gemini',
    fixture: '/tests/fixtures/videos/diamond-720-gemini.mp4',
    options: { videoProfile: 'diamond' },
    expectBlob: true,
    allowSkipped: true,
  },
];

function startStaticServer() {
  return new Promise((resolvePromise) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
        const filePath = join(ROOT, urlPath.replace(/^\//, ''));
        if (!filePath.startsWith(ROOT)) {
          res.writeHead(403).end('Forbidden');
          return;
        }
        if (!existsSync(filePath)) {
          res.writeHead(404).end('Not found');
          return;
        }
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
        createReadStream(filePath).pipe(res);
      } catch (error) {
        res.writeHead(500).end(String(error));
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolvePromise({ server, port });
    });
  });
}

async function buildBrowserTestBundle() {
  await esbuild.build({
    entryPoints: [join(ROOT, 'scripts/browser-test/run.mjs')],
    outfile: join(ROOT, 'scripts/browser-test/bundle.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    logLevel: 'silent',
  });
}

async function main() {
  for (const rel of [
    'dist/browser.js',
    'scripts/browser-test/harness.html',
    'tests/fixtures/videos/diamond-1080-gemini.mp4',
  ]) {
    if (!existsSync(join(ROOT, rel))) {
      console.error(`Missing required file: ${rel}. Run node build.js and download fixtures first.`);
      process.exit(2);
    }
  }

  await buildBrowserTestBundle();

  const { server, port } = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('pageerror', (error) => {
    console.error('[pageerror]', error.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[console]', msg.text());
    }
  });

  await page.goto(`${baseUrl}/scripts/browser-test/harness.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.runVideoTest === 'function');

  let failed = 0;

  for (const testCase of CASES) {
    process.stdout.write(`• ${testCase.name} ... `);
    try {
      const result = await page.evaluate(
        async ({ fixture, options }) => window.runVideoTest(fixture, options),
        { fixture: testCase.fixture, options: testCase.options },
      );

      if (result.size <= 0 && testCase.expectBlob) {
        throw new Error(`expected non-empty blob, got size=${result.size}`);
      }

      if (testCase.allowSkipped && result.skipped && result.reason === 'unsupported_resolution') {
        console.log(`ok (skipped: ${result.reason})`);
        continue;
      }

      if (testCase.expectBlob && result.size <= 0) {
        throw new Error(`empty output blob (reason=${result.reason})`);
      }

      console.log(`ok (${result.size} bytes, profile=${result.videoProfile})`);
    } catch (error) {
      failed++;
      console.log('FAIL');
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await browser.close();
  server.close();

  if (failed > 0) {
    process.exit(1);
  }

  console.log('\nAll browser WebCodecs video tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
