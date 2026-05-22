/**
 * Gemini watermark position/size detection for different image dimensions.
 *
 * Gemini uses two watermark sizes:
 * - 48×48 with 32px margins for images where both dimensions ≤ 1024
 * - 96×96 with 64px margins for larger images
 *
 * The watermark is always placed in the bottom-right corner as a white overlay.
 */

/** Dimension threshold — if either dimension exceeds this, use the larger watermark */
const LARGE_IMAGE_THRESHOLD = 1024

/** @type {Record<'small'|'large', { size: number, margin: number, alphaMapKey: string }>} */
const GEMINI_WATERMARK_SIZES = {
  small: { size: 48, margin: 32, alphaMapKey: 'gemini-48' },
  large: { size: 96, margin: 64, alphaMapKey: 'gemini-96' },
}

/**
 * Determine which watermark tier applies for a given image dimension.
 * @param {number} width
 * @param {number} height
 * @returns {'small'|'large'}
 */
function getWatermarkTier(width, height) {
  return (width <= LARGE_IMAGE_THRESHOLD && height <= LARGE_IMAGE_THRESHOLD)
    ? 'small'
    : 'large'
}

/**
 * Detect Gemini watermark configuration for given image dimensions.
 * Returns null if the image is too small to contain the watermark region.
 *
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {{ tier: string, size: number, margin: number, alphaMapKey: string }|null}
 */
export function detectGeminiWatermarkConfig(width, height) {
  const tier = getWatermarkTier(width, height)
  const config = GEMINI_WATERMARK_SIZES[tier]

  // Image must be large enough to contain the watermark + margins
  const minDim = config.size + config.margin
  if (width < minDim || height < minDim) return null

  return { tier, ...config }
}

/**
 * Calculate the expected watermark bounding box position.
 *
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {{ x: number, y: number, width: number, height: number }|null}
 */
export function calculateGeminiWatermarkPosition(width, height) {
  const config = detectGeminiWatermarkConfig(width, height)
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
 * @returns {{ alphaMapKey: string, size: number, margin: number, position: { x: number, y: number, width: number, height: number } }|null}
 */
export function getGeminiWatermarkInfo(width, height) {
  const config = detectGeminiWatermarkConfig(width, height)
  if (!config) return null

  return {
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

export { GEMINI_WATERMARK_SIZES, LARGE_IMAGE_THRESHOLD }
