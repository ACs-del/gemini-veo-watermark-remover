/**
 * Gemini watermark position/size detection for different image dimensions.
 *
 * Gemini currently has two visible watermark profiles:
 * - V2/current (Gemini 3.5+): 36×36 small, 96×96 large
 * - V1/legacy (pre-Gemini 3.5): 48×48 small, 96×96 large
 *
 * The watermark is always placed in the bottom-right corner as a white overlay.
 */

/** Dimension threshold — large only when both dimensions exceed this value. */
const LARGE_IMAGE_THRESHOLD = 1024

/** @typedef {'current'|'legacy'} GeminiWatermarkProfile */

/** @type {Record<GeminiWatermarkProfile, Record<'small'|'large', { size: number, alphaMapKey: string, margin?: number }>>} */
const GEMINI_WATERMARK_PROFILES = {
  current: {
    small: { size: 36, alphaMapKey: 'gemini-v2-36' },
    large: { size: 96, margin: 192, alphaMapKey: 'gemini-v2-96' },
  },
  legacy: {
    small: { size: 48, margin: 32, alphaMapKey: 'gemini-48' },
    large: { size: 96, margin: 64, alphaMapKey: 'gemini-96' },
  },
}

/** Backwards-compatible alias for the legacy profile table. */
const GEMINI_WATERMARK_SIZES = GEMINI_WATERMARK_PROFILES.legacy

/**
 * Normalize profile aliases used by the CLI and SDK.
 * @param {string|{ profile?: string }|undefined} profile
 * @returns {GeminiWatermarkProfile}
 */
function normalizeGeminiProfile(profile) {
  const value = typeof profile === 'object' && profile
    ? profile.profile
    : profile

  if (value === 'legacy' || value === 'v1' || value === 'V1') return 'legacy'
  return 'current'
}

/**
 * Determine which watermark tier applies for a given image dimension.
 * @param {number} width
 * @param {number} height
 * @returns {'small'|'large'}
 */
function getWatermarkTier(width, height) {
  return (width > LARGE_IMAGE_THRESHOLD && height > LARGE_IMAGE_THRESHOLD)
    ? 'large'
    : 'small'
}

/**
 * Resolve V2 small margin by inferring the canonical large source size.
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function calculateCurrentSmallMargin(width, height) {
  const longSide = Math.max(width, height)
  const shortSide = Math.min(width, height)

  let sourceLongDim
  if (shortSide >= 566) {
    sourceLongDim = 2752
  } else if (shortSide >= 550) {
    sourceLongDim = 2816
  } else {
    sourceLongDim = 2848
  }

  return Math.round(192 * (longSide / sourceLongDim))
}

/**
 * Detect Gemini watermark configuration for given image dimensions.
 * Returns null if the image is too small to contain the watermark region.
 *
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {string|{ profile?: string }} [profile='current'] - current/V2 or legacy/V1
 * @returns {{ tier: string, profile: GeminiWatermarkProfile, size: number, margin: number, alphaMapKey: string }|null}
 */
export function detectGeminiWatermarkConfig(width, height, profile = 'current') {
  const normalizedProfile = normalizeGeminiProfile(profile)
  const tier = getWatermarkTier(width, height)
  const config = GEMINI_WATERMARK_PROFILES[normalizedProfile][tier]
  const margin = config.margin ?? calculateCurrentSmallMargin(width, height)

  // Image must be large enough to contain the watermark + margins
  const minDim = config.size + margin
  if (width < minDim || height < minDim) return null

  return { tier, profile: normalizedProfile, ...config, margin }
}

/**
 * Calculate the expected watermark bounding box position.
 *
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {string|{ profile?: string }} [profile='current'] - current/V2 or legacy/V1
 * @returns {{ x: number, y: number, width: number, height: number }|null}
 */
export function calculateGeminiWatermarkPosition(width, height, profile = 'current') {
  const config = detectGeminiWatermarkConfig(width, height, profile)
  if (!config) return null

  return {
    x: width - config.margin - config.size,
    y: height - config.margin - config.size,
    width: config.size,
    height: config.size,
  }
}

/**
 * Get full watermark info including alpha map key for a given image.
 *
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {string|{ profile?: string }} [profile='current'] - current/V2 or legacy/V1
 * @returns {{ profile: GeminiWatermarkProfile, tier: string, alphaMapKey: string, size: number, margin: number, position: { x: number, y: number, width: number, height: number } }|null}
 */
export function getGeminiWatermarkInfo(width, height, profile = 'current') {
  const config = detectGeminiWatermarkConfig(width, height, profile)
  if (!config) return null

  return {
    profile: config.profile,
    tier: config.tier,
    alphaMapKey: config.alphaMapKey,
    size: config.size,
    margin: config.margin,
    position: {
      x: width - config.margin - config.size,
      y: height - config.margin - config.size,
      width: config.size,
      height: config.size,
    },
  }
}

export {
  GEMINI_WATERMARK_PROFILES,
  GEMINI_WATERMARK_SIZES,
  LARGE_IMAGE_THRESHOLD,
  calculateCurrentSmallMargin,
  getWatermarkTier,
  normalizeGeminiProfile,
}
