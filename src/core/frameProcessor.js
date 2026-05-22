/**
 * Per-frame watermark processing orchestrator.
 * Combines veoConfig + alphaMap + blendModes to process a single frame.
 */

import { removeWatermark } from './blendModes.js';
import { getVeoWatermarkInfo } from './veoConfig.js';
import { getEmbeddedAlphaMap } from './embeddedAlphaMaps.js';

/**
 * Process a single video frame to remove the Veo watermark.
 *
 * @param {ImageData} frameData - Frame pixel data
 * @param {{ width?: number, height?: number }} options - Override dimensions
 * @returns {{ imageData: ImageData, processed: boolean, reason?: string }}
 */
export function processFrame(frameData, options = {}) {
  const width = options.width || frameData.width;
  const height = options.height || frameData.height;

  const info = getVeoWatermarkInfo(width, height);
  if (!info) {
    return { imageData: frameData, processed: false, reason: 'unsupported_resolution' };
  }

  const alphaMap = getEmbeddedAlphaMap(info.alphaMapKey);
  if (!alphaMap) {
    return { imageData: frameData, processed: false, reason: 'missing_alpha_map' };
  }

  removeWatermark(frameData, alphaMap.data, info.position);
  return { imageData: frameData, processed: true };
}

/**
 * Create a reusable frame processor for a specific video (caches config lookup).
 *
 * @param {number} frameWidth
 * @param {number} frameHeight
 * @returns {{ process(frameData: ImageData): { imageData: ImageData, processed: boolean } }}
 */
export function createFrameProcessor(frameWidth, frameHeight) {
  const info = getVeoWatermarkInfo(frameWidth, frameHeight);
  if (!info) {
    return {
      process(frameData) {
        return { imageData: frameData, processed: false, reason: 'unsupported_resolution' };
      },
    };
  }

  const alphaMap = getEmbeddedAlphaMap(info.alphaMapKey);
  if (!alphaMap) {
    return {
      process(frameData) {
        return { imageData: frameData, processed: false, reason: 'missing_alpha_map' };
      },
    };
  }

  const position = info.position;
  const mapData = alphaMap.data;

  return {
    process(frameData) {
      removeWatermark(frameData, mapData, position);
      return { imageData: frameData, processed: true };
    },
  };
}
