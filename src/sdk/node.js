/**
 * Node.js SDK entry point.
 * Provides file-system based APIs using ffmpeg.wasm backend.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { processVideo } from '../video/pipeline.js';

export { removeWatermark } from '../core/blendModes.js';
export { processFrame, createFrameProcessor } from '../core/frameProcessor.js';
export {
  getVeoWatermarkInfo,
  detectVeoWatermarkConfig,
  calculateWatermarkPosition,
  normalizeVideoWatermarkProfile,
  GEMINI_DIAMOND_VIDEO_CATALOG,
  LEGACY_VEO_TEXT_CATALOG,
  VIDEO_WATERMARK_PROFILES,
  VEO_WATERMARK_CATALOG,
} from '../core/veoConfig.js';
export { getEmbeddedAlphaMap, registerAlphaMap } from '../core/embeddedAlphaMaps.js';
export { processVideo } from '../video/pipeline.js';

/**
 * Process a video file from disk and write result to output path.
 *
 * @param {string} inputPath - Source video file path
 * @param {string} outputPath - Destination file path
 * @param {{ onProgress?: (current: number, total: number) => void, videoProfile?: 'diamond'|'legacy' }} options
 */
export async function processVideoFile(inputPath, outputPath, options = {}) {
  const inputData = await readFile(inputPath);
  const result = await processVideo(new Uint8Array(inputData), {
    environment: 'node',
    ...options,
  });

  const output = result instanceof Blob
    ? new Uint8Array(await result.arrayBuffer())
    : result;

  await writeFile(outputPath, output);
  return {
    inputPath,
    outputPath,
    size: output.length,
    profile: result.videoProfile,
    processedFrames: result.processedFrames,
    skippedFrames: result.skippedFrames,
    skipped: result.skipped,
    reason: result.reason,
  };
}
