/**
 * Embedded alpha maps for video watermark removal.
 * Calibrated from GeminiWatermarkTool + VeoWatermarkRemover upstream captures.
 */

import { loadCalibratedAlphaMap } from './calibratedAlphaData.js'

const alphaMapRegistry = new Map()

const VIDEO_ALPHA_KEYS = [
  '720p-landscape',
  '720p-portrait',
  '1080p-landscape',
  '1080p-portrait',
  'veo-diamond-1080p-landscape',
  'veo-diamond-1080p-portrait',
]

for (const key of VIDEO_ALPHA_KEYS) {
  const loaded = loadCalibratedAlphaMap(key)
  if (loaded) {
    alphaMapRegistry.set(key, loaded)
  }
}

/**
 * Bilinear resize helper (used when registering custom maps).
 */
export function resizeAlphaMap(source, sourceWidth, sourceHeight, targetWidth, targetHeight) {
  if (sourceWidth === targetWidth && sourceHeight === targetHeight) {
    return new Float32Array(source)
  }

  const result = new Float32Array(targetWidth * targetHeight)
  const xScale = sourceWidth / targetWidth
  const yScale = sourceHeight / targetHeight

  for (let y = 0; y < targetHeight; y++) {
    const sourceY = (y + 0.5) * yScale - 0.5
    const sourceY0 = Math.floor(sourceY)
    const y0 = Math.max(0, sourceY0)
    const y1 = Math.min(sourceHeight - 1, y0 + 1)
    const yWeight = Math.max(0, Math.min(1, sourceY - sourceY0))

    for (let x = 0; x < targetWidth; x++) {
      const sourceX = (x + 0.5) * xScale - 0.5
      const sourceX0 = Math.floor(sourceX)
      const x0 = Math.max(0, sourceX0)
      const x1 = Math.min(sourceWidth - 1, x0 + 1)
      const xWeight = Math.max(0, Math.min(1, sourceX - sourceX0))

      const top =
        source[y0 * sourceWidth + x0] * (1 - xWeight) +
        source[y0 * sourceWidth + x1] * xWeight
      const bottom =
        source[y1 * sourceWidth + x0] * (1 - xWeight) +
        source[y1 * sourceWidth + x1] * xWeight

      result[y * targetWidth + x] = top * (1 - yWeight) + bottom * yWeight
    }
  }

  return result
}

/**
 * @param {string} key
 * @returns {{ data: Float32Array, width: number, height: number, source?: string } | null}
 */
export function getEmbeddedAlphaMap(key) {
  return alphaMapRegistry.get(key) || loadCalibratedAlphaMap(key)
}

export function registerAlphaMap(key, data, width, height, source = 'custom') {
  alphaMapRegistry.set(key, { data, width, height, source })
}

export function listAlphaMapKeys() {
  return Array.from(alphaMapRegistry.keys())
}
