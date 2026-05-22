/**
 * Browser SDK entry point.
 * Optimized for browser usage with WebCodecs priority.
 */

export { removeWatermark } from '../core/blendModes.js';
export { processFrame, createFrameProcessor } from '../core/frameProcessor.js';
export { getVeoWatermarkInfo } from '../core/veoConfig.js';
export { getEmbeddedAlphaMap, registerAlphaMap } from '../core/embeddedAlphaMaps.js';
export { processVideo } from '../video/pipeline.js';

/**
 * Browser-specific helper: process a video File and return a downloadable Blob.
 *
 * @param {File} file - Video file from <input> or drag-drop
 * @param {{ onProgress?: (current: number, total: number) => void }} options
 * @returns {Promise<Blob>} Processed MP4 blob
 */
export async function processVideoFile(file, options = {}) {
  const { processVideo } = await import('../video/pipeline.js');
  return processVideo(file, { environment: 'browser', ...options });
}

/**
 * Browser-specific helper: process a single image and return cleaned ImageData.
 */
export { processFrame as processImageFrame } from '../core/frameProcessor.js';
