/**
 * Alpha map management for Gemini watermarks.
 *
 * Alpha maps are pre-calibrated intensity maps where each pixel value (0–1)
 * represents how strongly the white watermark overlay affects that pixel.
 * These are derived from PNG files where RGB brightness = alpha intensity.
 *
 * Two sizes are supported:
 * - 48×48 for images ≤ 1024px in both dimensions
 * - 96×96 for larger images
 */

const geminiAlphaMapRegistry = new Map()

/**
 * Generate a Gemini sparkle/diamond pattern approximation.
 * The Gemini logo is a 4-pointed star shape. This generates a reasonable
 * placeholder that approximates the geometric structure of the real watermark.
 *
 * @param {number} size - Width/height (square alpha maps)
 * @returns {Float32Array}
 */
function generateGeminiSparklePattern(size) {
  const map = new Float32Array(size * size)
  const center = size / 2
  const radius = size * 0.38

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / radius
      const dy = (y - center) / radius

      // 4-pointed star: use the diamond distance metric with softening
      // |x| + |y| forms a diamond; we modulate to create star points
      const diamondDist = Math.abs(dx) + Math.abs(dy)
      const circularDist = Math.sqrt(dx * dx + dy * dy)

      // Blend diamond and circular for a sparkle shape
      // Star points emerge where diamond distance is significantly less than circular
      const starFactor = Math.max(0, 1 - diamondDist * 0.85)
      const circleFactor = Math.max(0, 1 - circularDist * 1.2)

      // Combine: inner circle + star points radiating outward
      let alpha = Math.max(starFactor * 0.7, circleFactor * 0.5)

      // Sharper falloff at edges
      alpha *= Math.max(0, 1 - circularDist * 0.9)

      // Central bright spot
      const centralDist = circularDist * 2.5
      if (centralDist < 1) {
        alpha = Math.max(alpha, (1 - centralDist) * 0.65)
      }

      // Clamp to valid range
      map[y * size + x] = Math.max(0, Math.min(0.75, alpha))
    }
  }

  return map
}

/**
 * Decode a Base64-encoded alpha map (from PNG brightness data).
 * Each byte in the decoded data represents a pixel alpha value (0–255 → 0–1).
 *
 * @param {string} base64Data - Base64-encoded raw alpha bytes
 * @param {number} size - Expected width/height
 * @returns {Float32Array}
 */
export function decodeAlphaMapFromBase64(base64Data, size) {
  const binary = typeof atob === 'function'
    ? atob(base64Data)
    : Buffer.from(base64Data, 'base64').toString('binary')

  const expectedLength = size * size
  const map = new Float32Array(expectedLength)

  for (let i = 0; i < Math.min(binary.length, expectedLength); i++) {
    map[i] = binary.charCodeAt(i) / 255
  }

  return map
}

/**
 * Load an alpha map from a URL (browser) or file path (Node.js).
 * The PNG is interpreted as a grayscale intensity map.
 *
 * @param {string} source - URL or file path to PNG
 * @param {number} size - Expected width/height
 * @returns {Promise<Float32Array>}
 */
export async function loadAlphaMapFromPNG(source, size) {
  // Browser environment: use Canvas to decode
  if (typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
    const response = await fetch(source)
    const blob = await response.blob()
    const bitmap = await createImageBitmap(blob)

    const canvas = new OffscreenCanvas(size, size)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, size, size)

    const imageData = ctx.getImageData(0, 0, size, size)
    const map = new Float32Array(size * size)

    for (let i = 0; i < size * size; i++) {
      // Use red channel as alpha intensity (grayscale PNG)
      map[i] = imageData.data[i * 4] / 255
    }
    return map
  }

  // Node.js: read file and decode raw pixel data
  const { readFile } = await import('node:fs/promises')
  const fileData = await readFile(source)

  // Simple PNG decoder: extract IDAT chunks and decompress
  // For production, this should use a proper PNG library
  // Fallback: treat as raw grayscale if not a valid PNG
  if (fileData[0] === 0x89 && fileData[1] === 0x50) {
    // PNG signature detected — use dynamic import for decoding
    const { createCanvas, loadImage } = await import('canvas').catch(() => null) || {}
    if (createCanvas && loadImage) {
      const img = await loadImage(fileData)
      const canvas = createCanvas(size, size)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, size, size)
      const pixel = ctx.getImageData(0, 0, size, size)
      const map = new Float32Array(size * size)
      for (let i = 0; i < size * size; i++) {
        map[i] = pixel.data[i * 4] / 255
      }
      return map
    }
  }

  // Fallback: raw byte interpretation
  const map = new Float32Array(size * size)
  for (let i = 0; i < Math.min(fileData.length, size * size); i++) {
    map[i] = fileData[i] / 255
  }
  return map
}

// Pre-register placeholder alpha maps with sparkle pattern
const GEMINI_ALPHA_MAP_SIZES = [
  { key: 'gemini-48', size: 48 },
  { key: 'gemini-96', size: 96 },
]

for (const { key, size } of GEMINI_ALPHA_MAP_SIZES) {
  geminiAlphaMapRegistry.set(key, {
    data: generateGeminiSparklePattern(size),
    width: size,
    height: size,
    source: 'placeholder',
  })
}

/**
 * Get a Gemini alpha map by size key.
 *
 * @param {string} key - 'gemini-48' or 'gemini-96'
 * @returns {{ data: Float32Array, width: number, height: number, source: string }|null}
 */
export function getGeminiAlphaMap(key) {
  return geminiAlphaMapRegistry.get(key) || null
}

/**
 * Register a calibrated alpha map (replaces placeholder).
 *
 * @param {string} key - Map key ('gemini-48' or 'gemini-96')
 * @param {Float32Array} data - Alpha values (size × size)
 * @param {number} size - Width/height
 * @param {string} [source='custom'] - Data source identifier
 */
export function registerGeminiAlphaMap(key, data, size, source = 'custom') {
  geminiAlphaMapRegistry.set(key, { data, width: size, height: size, source })
}

/**
 * Load and register an alpha map from an external PNG.
 *
 * @param {string} key - Map key to register under
 * @param {string} pngSource - URL or file path
 * @param {number} size - Expected dimensions
 * @returns {Promise<void>}
 */
export async function loadAndRegisterAlphaMap(key, pngSource, size) {
  const data = await loadAlphaMapFromPNG(pngSource, size)
  registerGeminiAlphaMap(key, data, size, pngSource)
}

/**
 * List all registered Gemini alpha map keys.
 * @returns {string[]}
 */
export function listGeminiAlphaMapKeys() {
  return Array.from(geminiAlphaMapRegistry.keys())
}

export { geminiAlphaMapRegistry, generateGeminiSparklePattern }
