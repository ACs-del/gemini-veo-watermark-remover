/**
 * Veo watermark position/size detection for different video resolutions.
 */

/**
 * Known Veo watermark configurations per resolution.
 * Watermark is always "Veo" text in the bottom-right corner.
 */
const VEO_WATERMARK_CATALOG = {
  '1280x720': {
    key: '720p-landscape',
    watermark: { width: 80, height: 28 },
    position: { x: 1180, y: 684 },  // bottom-right
  },
  '720x1280': {
    key: '720p-portrait',
    watermark: { width: 80, height: 28 },
    position: { x: 620, y: 1244 },
  },
  '1920x1080': {
    key: '1080p-landscape',
    watermark: { width: 120, height: 42 },
    position: { x: 1772, y: 1028 },
  },
  '1080x1920': {
    key: '1080p-portrait',
    watermark: { width: 120, height: 42 },
    position: { x: 932, y: 1868 },
  },
};

/**
 * Detect watermark config for a given video resolution.
 * @param {number} width
 * @param {number} height
 * @returns {object|null} Config or null if resolution unknown
 */
export function detectVeoWatermarkConfig(width, height) {
  const key = `${width}x${height}`;
  return VEO_WATERMARK_CATALOG[key] || null;
}

/**
 * Calculate watermark bounding box for a given resolution.
 * @param {number} width
 * @param {number} height
 * @returns {{ x: number, y: number, width: number, height: number }|null}
 */
export function calculateWatermarkPosition(width, height) {
  const config = detectVeoWatermarkConfig(width, height);
  if (!config) return null;

  return {
    x: config.position.x,
    y: config.position.y,
    width: config.watermark.width,
    height: config.watermark.height,
  };
}

/**
 * Get full watermark info including alpha map key.
 */
export function getVeoWatermarkInfo(width, height) {
  const config = detectVeoWatermarkConfig(width, height);
  if (!config) return null;

  return {
    alphaMapKey: config.key,
    position: {
      x: config.position.x,
      y: config.position.y,
      width: config.watermark.width,
      height: config.watermark.height,
    },
  };
}

export { VEO_WATERMARK_CATALOG };
