#!/usr/bin/env node
/**
 * Native ffmpeg video pipeline for local fixture generation and CI demos.
 *
 * The published CLI uses ffmpeg.wasm in Node, which currently fails with
 * "ffmpeg.wasm does not support nodejs". This script reuses the same
 * frameProcessor core with system ffmpeg for decode/encode.
 *
 * Usage:
 *   node scripts/process-video-native.mjs input.mp4 output.mp4 [--legacy] [--verbose]
 */

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createFrameProcessor } from '../src/core/frameProcessor.js';

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

/** @returns {Promise<{ width: number, height: number, fps: number, duration: number }>} */
async function probeVideo(filePath) {
  const args = [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,avg_frame_rate,duration',
    '-of', 'json',
    filePath,
  ];

  const output = await runCommand('ffprobe', args);
  const json = JSON.parse(output);
  const stream = json.streams?.[0];
  if (!stream) throw new Error(`No video stream in ${filePath}`);

  const fpsSource = stream.avg_frame_rate && stream.avg_frame_rate !== '0/0'
    ? stream.avg_frame_rate
    : stream.r_frame_rate;
  const [num, den] = fpsSource.split('/').map(Number);
  const fps = den ? num / den : Number(fpsSource) || 30;

  return {
    width: stream.width,
    height: stream.height,
    fps,
    duration: Number(stream.duration) || 0,
  };
}

function runCommand(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise(stdout);
      else reject(new Error(`${cmd} exited ${code}: ${stderr.trim() || stdout.trim()}`));
    });
  });
}

/**
 * Decode → process → encode via piped ffmpeg processes.
 */
async function processVideoNative({ inputPath, outputPath, videoProfile, verbose }) {
  const { width, height, fps, duration } = await probeVideo(inputPath);
  const processor = createFrameProcessor(width, height, { videoProfile });
  const frameBytes = width * height * 4;
  const totalFrames = duration > 0 ? Math.round(duration * fps) : null;

  if (verbose) {
    console.log(`Input: ${inputPath}`);
    console.log(`Resolution: ${width}x${height} @ ${fps.toFixed(3)} fps`);
    console.log(`Profile: ${videoProfile} (catalog: ${processor.profile ?? 'none'})`);
    if (processor.position) console.log(`Watermark region: ${JSON.stringify(processor.position)}`);
  }

  await mkdir(dirname(outputPath), { recursive: true });

  const decoder = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', inputPath,
    '-an',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    'pipe:1',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  const encoder = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${width}x${height}`,
    '-r', String(fps),
    '-i', 'pipe:0',
    '-i', inputPath,
    '-map', '0:v:0',
    '-map', '1:a?',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    '-y', outputPath,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  let frameIndex = 0;
  let processedFrames = 0;
  let skippedFrames = 0;
  let skipReason = null;
  let pending = Buffer.alloc(0);

  const flushFrame = (frameBuffer) => {
    const pixels = new Uint8ClampedArray(frameBuffer.buffer, frameBuffer.byteOffset, frameBytes);
    const frameData = { width, height, data: pixels };
    const result = processor.process(frameData);

    if (result.processed) processedFrames++;
    else {
      skippedFrames++;
      skipReason = skipReason || result.reason || 'not_processed';
    }

    encoder.stdin.write(Buffer.from(frameData.data));
    frameIndex++;

    if (verbose && totalFrames && frameIndex % Math.max(1, Math.floor(totalFrames / 10)) === 0) {
      console.log(`Progress: ${frameIndex}/${totalFrames}`);
    }
  };

  await new Promise((resolvePromise, reject) => {
    decoder.stdout.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= frameBytes) {
        const frameBuffer = pending.subarray(0, frameBytes);
        pending = pending.subarray(frameBytes);
        flushFrame(frameBuffer);
      }
    });

    decoder.stderr.on('data', (chunk) => {
      if (verbose) process.stderr.write(chunk);
    });

    encoder.stderr.on('data', (chunk) => {
      if (verbose) process.stderr.write(chunk);
    });

    decoder.on('error', reject);
    encoder.on('error', reject);

    decoder.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`decoder ffmpeg exited ${code}`));
        return;
      }
      if (pending.length > 0 && pending.length < frameBytes) {
        // Drop partial trailing frame.
        pending = Buffer.alloc(0);
      }
      encoder.stdin.end();
    });

    encoder.on('close', (code) => {
      if (code !== 0) reject(new Error(`encoder ffmpeg exited ${code}`));
      else resolvePromise();
    });
  });

  const summary = {
    inputPath,
    outputPath,
    width,
    height,
    fps,
    videoProfile: processor.profile,
    processedFrames,
    skippedFrames,
    skipped: processedFrames === 0,
    reason: processedFrames === 0 ? skipReason : null,
    frameCount: frameIndex,
  };

  if (verbose) console.log(JSON.stringify(summary, null, 2));
  return summary;
}

const options = parseArgs(process.argv.slice(2));

processVideoNative(options)
  .then((result) => {
    if (result.skipped) {
      console.error(`Skipped: ${result.reason ?? 'no frames processed'}`);
      process.exit(1);
    }
    console.log(`Wrote ${result.outputPath} (${result.processedFrames}/${result.frameCount} frames)`);
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exit(2);
  });
