/**
 * Embedded alpha maps for Veo watermark removal.
 * In production, these would be Float32Array data calibrated from real Veo videos.
 * Currently provides placeholder maps for development/testing.
 */

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

// Pre-register placeholder maps for known resolutions
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
