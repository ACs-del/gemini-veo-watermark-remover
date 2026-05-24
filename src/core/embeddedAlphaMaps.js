/**
 * Embedded alpha maps for video watermark removal.
 * In production, these would be Float32Array data calibrated from real videos.
 * Currently provides placeholder maps for development/testing.
 */

import { getGeminiAlphaMap } from './gemini/geminiAlphaMaps.js';

const alphaMapRegistry = new Map();

/**
 * Generate a placeholder alpha map (Gaussian-ish shape for testing).
 * Real maps need frame-differencing calibration from Veo video samples.
 */
function generatePlaceholderAlphaMap(width, height) {
  const map = new Float32Array(width * height);
  const cx = width / 2;
  const cy = height / 2;
  const sigmaX = width / 4;
  const sigmaY = height / 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / sigmaX;
      const dy = (y - cy) / sigmaY;
      // Gaussian blob to simulate watermark alpha
      map[y * width + x] = Math.exp(-(dx * dx + dy * dy)) * 0.6;
    }
  }
  return map;
}

/**
 * Resize an alpha map to a target rectangle using bilinear interpolation.
 */
function resizeAlphaMap(source, sourceWidth, sourceHeight, targetWidth, targetHeight) {
  if (sourceWidth === targetWidth && sourceHeight === targetHeight) {
    return new Float32Array(source);
  }

  const result = new Float32Array(targetWidth * targetHeight);
  const xScale = sourceWidth / targetWidth;
  const yScale = sourceHeight / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const sourceY = (y + 0.5) * yScale - 0.5;
    const sourceY0 = Math.floor(sourceY);
    const y0 = Math.max(0, sourceY0);
    const y1 = Math.min(sourceHeight - 1, y0 + 1);
    const yWeight = Math.max(0, Math.min(1, sourceY - sourceY0));

    for (let x = 0; x < targetWidth; x++) {
      const sourceX = (x + 0.5) * xScale - 0.5;
      const sourceX0 = Math.floor(sourceX);
      const x0 = Math.max(0, sourceX0);
      const x1 = Math.min(sourceWidth - 1, x0 + 1);
      const xWeight = Math.max(0, Math.min(1, sourceX - sourceX0));

      const top =
        source[y0 * sourceWidth + x0] * (1 - xWeight) +
        source[y0 * sourceWidth + x1] * xWeight;
      const bottom =
        source[y1 * sourceWidth + x0] * (1 - xWeight) +
        source[y1 * sourceWidth + x1] * xWeight;

      result[y * targetWidth + x] = top * (1 - yWeight) + bottom * yWeight;
    }
  }

  return result;
}

// Pre-register legacy text placeholder maps for known resolutions
const KNOWN_MAPS = [
  { key: '720p-landscape', width: 80, height: 28 },
  { key: '720p-portrait', width: 80, height: 28 },
  { key: '1080p-landscape', width: 120, height: 42 },
  { key: '1080p-portrait', width: 120, height: 42 },
];

for (const { key, width, height } of KNOWN_MAPS) {
  alphaMapRegistry.set(key, {
    data: generatePlaceholderAlphaMap(width, height),
    width,
    height,
  });
}

const geminiV2Large = getGeminiAlphaMap('gemini-v2-96');
const diamondSource = geminiV2Large || {
  data: generatePlaceholderAlphaMap(96, 96),
  width: 96,
  height: 96,
  source: 'placeholder',
};

for (const key of ['veo-diamond-1080p-landscape', 'veo-diamond-1080p-portrait']) {
  alphaMapRegistry.set(key, {
    data: resizeAlphaMap(diamondSource.data, diamondSource.width, diamondSource.height, 96, 96),
    width: 96,
    height: 96,
    source: diamondSource.source || 'gemini-v2-96',
  });
}

/**
 * Get an embedded alpha map by key.
 * @param {string} key - e.g. '720p-landscape'
 * @returns {{ data: Float32Array, width: number, height: number } | null}
 */
export function getEmbeddedAlphaMap(key) {
  return alphaMapRegistry.get(key) || null;
}

/**
 * Register a custom alpha map (for calibration/testing).
 */
export function registerAlphaMap(key, data, width, height) {
  alphaMapRegistry.set(key, { data, width, height });
}

/**
 * List all registered alpha map keys.
 */
export function listAlphaMapKeys() {
  return Array.from(alphaMapRegistry.keys());
}

export { resizeAlphaMap };
