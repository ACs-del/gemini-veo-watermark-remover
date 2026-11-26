#!/usr/bin/env node
/**
 * Native ffmpeg video pipeline for local fixture generation and CI demos.
 *
 * Usage:
 *   node scripts/process-video-native.mjs input.mp4 output.mp4 [--legacy] [--verbose]
 */

import { resolve } from 'node:path'
import { processNative } from '../src/video/native.js'

function parseArgs(argv) {
  const positional = [];
  let legacy = false;
  let verbose = false;

  for (const arg of argv) {
    if (arg === '--legacy') legacy = true;
    else if (arg === '--verbose') verbose = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/process-video-native.mjs <input> <output> [--legacy] [--verbose]`);
      process.exit(0);
    } else if (!arg.startsWith('-')) positional.push(arg);
  }

  if (positional.length < 2) {
    console.error('Expected: input.mp4 output.mp4');
    process.exit(2);
  }

  return {
    inputPath: resolve(positional[0]),
    outputPath: resolve(positional[1]),
    videoProfile: legacy ? 'legacy' : 'diamond',
    verbose,
  };
}

const options = parseArgs(process.argv.slice(2));

processNative(options)
  .then((result) => {
    if (result.skipped) {
      console.error(`Skipped: ${result.reason ?? 'no frames processed'}`);
      process.exit(1);
    }
    console.log(`Wrote ${result.outputPath} (${result.processedFrames}/${result.processedFrames + result.skippedFrames} frames)`);
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exit(2);
  });
