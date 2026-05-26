/**
 * Alpha map management for Gemini watermarks.
 *
 * Calibrated maps are embedded from GeminiWatermarkTool v0.3.1 captures
 * (see scripts/embed-alpha-maps.mjs and assets/masks/).
 */

import {
  CALIBRATED_ALPHA_ENTRIES,
  decodeCalibratedAlpha,
  loadCalibratedAlphaMap,
} from '../calibratedAlphaData.js'

const geminiAlphaMapRegistry = new Map()

const GEMINI_ALPHA_MAP_KEYS = [
  'gemini-v2-36',
  'gemini-v2-96',
  'gemini-48',
  'gemini-96',
]

for (const key of GEMINI_ALPHA_MAP_KEYS) {
  const loaded = loadCalibratedAlphaMap(key)
  if (loaded) {
    geminiAlphaMapRegistry.set(key, loaded)
  }
}

/**
 * Decode a Base64-encoded alpha map (from PNG brightness data).
 * @param {string} base64Data
 * @param {number} size
 * @returns {Float32Array}
 */
export function decodeAlphaMapFromBase64(base64Data, size) {
  return decodeCalibratedAlpha({ width: size, height: size, dataBase64: base64Data })
}

/**
 * Load an alpha map from a URL (browser) or file path (Node.js).
 * @param {string} source
 * @param {number} size
 * @returns {Promise<Float32Array>}
 */
export async function loadAlphaMapFromPNG(source, size) {
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
      const idx = i * 4
      map[i] = Math.max(imageData.data[idx], imageData.data[idx + 1], imageData.data[idx + 2]) / 255
    }
    return map
  }

  const { readFile } = await import('node:fs/promises')
  const fileData = await readFile(source)

  if (fileData[0] === 0x89 && fileData[1] === 0x50) {
    const sharp = (await import('sharp')).default
    const { data, info } = await sharp(fileData).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const map = new Float32Array(info.width * info.height)
    for (let i = 0; i < map.length; i++) {
      const base = i * info.channels
      map[i] = Math.max(data[base], data[base + 1], data[base + 2]) / 255
    }
    return map
  }

  const map = new Float32Array(size * size)
  for (let i = 0; i < Math.min(fileData.length, size * size); i++) {
    map[i] = fileData[i] / 255
  }
  return map
}

/**
 * @param {string} key
 * @returns {{ data: Float32Array, width: number, height: number, source: string }|null}
 */
export function getGeminiAlphaMap(key) {
  return geminiAlphaMapRegistry.get(key) || loadCalibratedAlphaMap(key)
}

export function registerGeminiAlphaMap(key, data, size, source = 'custom') {
  geminiAlphaMapRegistry.set(key, { data, width: size, height: size, source })
}

export async function loadAndRegisterAlphaMap(key, pngSource, size) {
  const data = await loadAlphaMapFromPNG(pngSource, size)
  registerGeminiAlphaMap(key, data, size, pngSource)
}

export function listGeminiAlphaMapKeys() {
  return Array.from(new Set([...geminiAlphaMapRegistry.keys(), ...Object.keys(CALIBRATED_ALPHA_ENTRIES)]))
}

export { geminiAlphaMapRegistry, CALIBRATED_ALPHA_ENTRIES, loadCalibratedAlphaMap }
