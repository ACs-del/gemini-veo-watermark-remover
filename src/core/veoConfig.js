/**
 * Veo/Gemini video watermark position/size detection for known resolutions.
 */

/** @typedef {'diamond'|'legacy'} VideoWatermarkProfile */

/**
 * Legacy pre-Gemini-3.5 videos carry the "Veo" text watermark.
 * The short keys are kept for backwards compatibility with existing alpha maps.
 */
const LEGACY_VEO_TEXT_CATALOG = {
  '1280x720': {
    key: '720p-landscape',
    profile: 'legacy',
    watermark: { width: 80, height: 28 },
    position: { x: 1180, y: 684 },
  },
  '720x1280': {
    key: '720p-portrait',
    profile: 'legacy',
    watermark: { width: 80, height: 28 },
    position: { x: 620, y: 1244 },
  },
  '1920x1080': {
    key: '1080p-landscape',
    profile: 'legacy',
    watermark: { width: 120, height: 42 },
    position: { x: 1772, y: 1028 },
  },
  '1080x1920': {
    key: '1080p-portrait',
    profile: 'legacy',
    watermark: { width: 120, height: 42 },
    position: { x: 932, y: 1868 },
  },
};

/**
 * Gemini 3.5+ videos carry the Gemini diamond logo. Upstream v0.5.0-demo
 * currently validates only 1080p landscape and portrait.
 */
const GEMINI_DIAMOND_VIDEO_CATALOG = {
  '1920x1080': {
    key: 'veo-diamond-1080p-landscape',
    profile: 'diamond',
    watermark: { width: 96, height: 96 },
    position: { x: 1632, y: 792 },
  },
  '1080x1920': {
    key: 'veo-diamond-1080p-portrait',
    profile: 'diamond',
    watermark: { width: 96, height: 96 },
    position: { x: 792, y: 1632 },
  },
};

const VIDEO_WATERMARK_PROFILES = {
  diamond: GEMINI_DIAMOND_VIDEO_CATALOG,
  legacy: LEGACY_VEO_TEXT_CATALOG,
};

/**
 * Normalize profile aliases used by CLI and SDK options.
 * @param {string|{ videoProfile?: string, profile?: string }|undefined} profile
 * @returns {VideoWatermarkProfile|null}
 */
export function normalizeVideoWatermarkProfile(profile) {
  const value = typeof profile === 'object' && profile
    ? profile.videoProfile ?? profile.profile
    : profile;

  if (!value || value === 'diamond' || value === 'current' || value === 'v2' || value === 'gemini') {
    return 'diamond';
  }
  if (value === 'legacy' || value === 'veo' || value === 'text' || value === 'v1') {
    return 'legacy';
  }
  return null;
}

/**
 * Detect watermark config for a given video resolution and profile.
 * @param {number} width
 * @param {number} height
 * @param {string|{ videoProfile?: string, profile?: string }} [profile='diamond']
 * @returns {object|null} Config or null if resolution unknown
 */
export function detectVeoWatermarkConfig(width, height, profile = 'diamond') {
  const normalizedProfile = normalizeVideoWatermarkProfile(profile);
  if (!normalizedProfile) return null;

  const key = `${width}x${height}`;
  return VIDEO_WATERMARK_PROFILES[normalizedProfile][key] || null;
}

/**
 * Calculate watermark bounding box for a given resolution.
 * @param {number} width
 * @param {number} height
 * @param {string|{ videoProfile?: string, profile?: string }} [profile='diamond']
 * @returns {{ x: number, y: number, width: number, height: number }|null}
 */
export function calculateWatermarkPosition(width, height, profile = 'diamond') {
  const config = detectVeoWatermarkConfig(width, height, profile);
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
 * @param {number} width
 * @param {number} height
 * @param {string|{ videoProfile?: string, profile?: string }} [profile='diamond']
 */
export function getVeoWatermarkInfo(width, height, profile = 'diamond') {
  const normalizedProfile = normalizeVideoWatermarkProfile(profile);
  if (!normalizedProfile) return null;

  const config = detectVeoWatermarkConfig(width, height, normalizedProfile);
  if (!config) return null;

  return {
    profile: normalizedProfile,
    alphaMapKey: config.key,
    position: {
      x: config.position.x,
      y: config.position.y,
      width: config.watermark.width,
      height: config.watermark.height,
    },
  };
}

const VEO_WATERMARK_CATALOG = LEGACY_VEO_TEXT_CATALOG;

export {
  GEMINI_DIAMOND_VIDEO_CATALOG,
  LEGACY_VEO_TEXT_CATALOG,
  VIDEO_WATERMARK_PROFILES,
  VEO_WATERMARK_CATALOG,
};
