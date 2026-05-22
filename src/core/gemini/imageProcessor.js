/**
 * Gemini image watermark removal processor.
 *
 * Pipeline:
 * 1. Detect watermark tier (48 or 96) based on image dimensions
 * 2. Load corresponding alpha map
 * 3. NCC template matching to find exact watermark position in bottom-right region
 * 4. Apply reverse alpha blending to restore original pixels
 *
 * Works with raw ImageData — environment-agnostic (browser + Node.js).
 */

import { removeWatermark } from '../blendModes.js'
import { getGeminiWatermarkInfo } from './geminiConfig.js'
import { getGeminiAlphaMap } from './geminiAlphaMaps.js'

/**
 * Compute Normalized Cross-Correlation between an image region and the alpha map.
 * Measures how well the brightness pattern matches the expected watermark shape.
 *
 * @param {Uint8ClampedArray} imgData - Image pixel data (RGBA)
 * @param {number} imgW - Image width
 * @param {number} x - Region top-left X
 * @param {number} y - Region top-left Y
 * @param {Float32Array} maskAlpha - Alpha map values
 * @param {number} maskW - Mask width
 * @param {number} maskH - Mask height
 * @param {number} step - Sampling step (1 = full, 2 = half resolution)
 * @returns {number} NCC score (0–1, higher = better match)
 */
function computeNCC(imgData, imgW, x, y, maskAlpha, maskW, maskH, step) {
  let sumImg = 0, sumMask = 0
  let sumImgSq = 0, sumMaskSq = 0
  let sumProduct = 0
  let count = 0

  for (let my = 0; my < maskH; my += step) {
    for (let mx = 0; mx < maskW; mx += step) {
      const alpha = maskAlpha[my * maskW + mx]
      if (alpha < 0.01) continue

      const px = x + mx
      const py = y + my
      const idx = (py * imgW + px) * 4

      // Compute brightness (average of RGB)
      const brightness = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3

      // The watermark adds white overlay proportional to alpha,
      // so brighter-than-expected pixels correlate with higher alpha
      sumImg += brightness
      sumMask += alpha
      sumImgSq += brightness * brightness
      sumMaskSq += alpha * alpha
      sumProduct += brightness * alpha
      count++
    }
  }

  if (count < 10) return 0

  // NCC formula
  const meanImg = sumImg / count
  const meanMask = sumMask / count
  const numerator = (sumProduct / count) - (meanImg * meanMask)
  const denomImg = Math.sqrt(Math.max(0, (sumImgSq / count) - meanImg * meanImg))
  const denomMask = Math.sqrt(Math.max(0, (sumMaskSq / count) - meanMask * meanMask))

  if (denomImg < 1e-6 || denomMask < 1e-6) return 0

  return Math.max(0, numerator / (denomImg * denomMask))
}

/**
 * Find the exact watermark position using NCC template matching.
 * Searches in a constrained region around the expected bottom-right location.
 *
 * @param {ImageData} imageData - Full image data
 * @param {{ width: number, height: number, alpha: Float32Array }} mask - Alpha mask info
 * @returns {{ x: number, y: number, confidence: number }|null}
 */
function findWatermarkPosition(imageData, mask) {
  const { width: imgW, height: imgH, data: imgData } = imageData
  const { width: maskW, height: maskH, alpha: maskAlpha } = mask

  let bestX = 0, bestY = 0, bestScore = -1

  const margin = maskW === 96 ? 64 : 32
  const expectedX = imgW - margin - maskW
  const expectedY = imgH - margin - maskH
  const searchRadius = Math.max(16, Math.round(maskW * 0.75))
  const searchStartX = Math.max(0, expectedX - searchRadius)
  const searchStartY = Math.max(0, expectedY - searchRadius)
  const searchMaxX = Math.min(imgW - maskW, expectedX + searchRadius)
  const searchMaxY = Math.min(imgH - maskH, expectedY + searchRadius)

  // Coarse search (step=2) to quickly find approximate location
  for (let y = searchStartY; y <= searchMaxY; y += 2) {
    for (let x = searchStartX; x <= searchMaxX; x += 2) {
      const score = computeNCC(imgData, imgW, x, y, maskAlpha, maskW, maskH, 2)
      if (score > bestScore) { bestScore = score; bestX = x; bestY = y }
    }
  }

  // Fine search (step=1) around the best coarse match
  const fineStartX = Math.max(0, bestX - 2)
  const fineStartY = Math.max(0, bestY - 2)
  const fineEndX = Math.min(searchMaxX, bestX + 2)
  const fineEndY = Math.min(searchMaxY, bestY + 2)

  for (let y = fineStartY; y <= fineEndY; y++) {
    for (let x = fineStartX; x <= fineEndX; x++) {
      const score = computeNCC(imgData, imgW, x, y, maskAlpha, maskW, maskH, 1)
      if (score > bestScore) { bestScore = score; bestX = x; bestY = y }
    }
  }

  // Require minimum confidence threshold
  return bestScore >= 0.5 ? { x: bestX, y: bestY, confidence: bestScore } : null
}

/**
 * Process a single image to remove the Gemini watermark.
 *
 * @param {ImageData} imageData - The watermarked image (mutated in place)
 * @param {{ skipDetection?: boolean, forcePosition?: { x: number, y: number } }} options
 * @returns {{ imageData: ImageData, processed: boolean, confidence: number, position: { x: number, y: number, width: number, height: number }|null, reason?: string }}
 */
export function processImage(imageData, options = {}) {
  const { width, height } = imageData
  const { skipDetection = false, forcePosition } = options

  const info = getGeminiWatermarkInfo(width, height)
  if (!info) {
    return {
      imageData,
      processed: false,
      confidence: 0,
      position: null,
      reason: 'image_too_small',
    }
  }

  const alphaMapEntry = getGeminiAlphaMap(info.alphaMapKey)
  if (!alphaMapEntry) {
    return {
      imageData,
      processed: false,
      confidence: 0,
      position: null,
      reason: 'missing_alpha_map',
    }
  }

  let position
  let confidence = 1.0

  if (forcePosition) {
    // Use explicitly provided position (skip NCC matching)
    position = {
      x: forcePosition.x,
      y: forcePosition.y,
      width: info.size,
      height: info.size,
    }
  } else if (skipDetection) {
    // Use expected position without NCC verification
    position = info.position
  } else {
    // NCC template matching to find exact position
    const mask = {
      width: alphaMapEntry.width,
      height: alphaMapEntry.height,
      alpha: alphaMapEntry.data,
    }

    const match = findWatermarkPosition(imageData, mask)
    if (!match) {
      return {
        imageData,
        processed: false,
        confidence: 0,
        position: null,
        reason: 'watermark_not_detected',
      }
    }

    confidence = match.confidence
    position = {
      x: match.x,
      y: match.y,
      width: alphaMapEntry.width,
      height: alphaMapEntry.height,
    }
  }

  // Apply reverse alpha blending
  removeWatermark(imageData, alphaMapEntry.data, position)

  return {
    imageData,
    processed: true,
    confidence,
    position,
  }
}

/**
 * Create a reusable image processor with cached config for a specific image size.
 * Useful when processing multiple images of the same dimensions.
 *
 * @param {number} [targetWidth] - Optional fixed width (auto-detect if omitted)
 * @param {number} [targetHeight] - Optional fixed height (auto-detect if omitted)
 * @returns {{ process(imageData: ImageData, options?: object): object }}
 */
export function createImageProcessor(targetWidth, targetHeight) {
  // If dimensions are pre-specified, cache the lookup
  let cachedInfo = null
  let cachedAlphaMap = null

  if (targetWidth && targetHeight) {
    cachedInfo = getGeminiWatermarkInfo(targetWidth, targetHeight)
    if (cachedInfo) {
      cachedAlphaMap = getGeminiAlphaMap(cachedInfo.alphaMapKey)
    }
  }

  return {
    /**
     * Process an image to remove the Gemini watermark.
     * @param {ImageData} imageData
     * @param {{ skipDetection?: boolean, forcePosition?: { x: number, y: number } }} options
     */
    process(imageData, options = {}) {
      // Use cached config if dimensions match, otherwise dynamic lookup
      if (cachedInfo && imageData.width === targetWidth && imageData.height === targetHeight) {
        if (!cachedAlphaMap) {
          return {
            imageData,
            processed: false,
            confidence: 0,
            position: null,
            reason: 'missing_alpha_map',
          }
        }

        const { skipDetection = false, forcePosition } = options
        let position
        let confidence = 1.0

        if (forcePosition) {
          position = { x: forcePosition.x, y: forcePosition.y, width: cachedInfo.size, height: cachedInfo.size }
        } else if (skipDetection) {
          position = cachedInfo.position
        } else {
          const mask = { width: cachedAlphaMap.width, height: cachedAlphaMap.height, alpha: cachedAlphaMap.data }
          const match = findWatermarkPosition(imageData, mask)
          if (!match) {
            return { imageData, processed: false, confidence: 0, position: null, reason: 'watermark_not_detected' }
          }
          confidence = match.confidence
          position = { x: match.x, y: match.y, width: cachedAlphaMap.width, height: cachedAlphaMap.height }
        }

        removeWatermark(imageData, cachedAlphaMap.data, position)
        return { imageData, processed: true, confidence, position }
      }

      // Fallback to full dynamic processing
      return processImage(imageData, options)
    },
  }
}

export { findWatermarkPosition, computeNCC }
