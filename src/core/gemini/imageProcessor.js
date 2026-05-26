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
import { getGeminiWatermarkInfo, normalizeGeminiProfile } from './geminiConfig.js'
import { getGeminiAlphaMap } from './geminiAlphaMaps.js'
import { cloneImageData, validateRestoration } from './restorationMetrics.js'

const PROFILE_ORDER = ['current', 'legacy']
const DEFAULT_MAX_PASSES = 4

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
 * @param {{ x: number, y: number, width: number, height: number }} expectedPosition - Expected region
 * @returns {{ x: number, y: number, confidence: number }|null}
 */
function findWatermarkPosition(imageData, mask, expectedPosition) {
  const { width: imgW, height: imgH, data: imgData } = imageData
  const { width: maskW, height: maskH, alpha: maskAlpha } = mask

  let bestX = 0, bestY = 0, bestScore = -1

  const expectedX = expectedPosition?.x ?? (imgW - maskW)
  const expectedY = expectedPosition?.y ?? (imgH - maskH)
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

function getProfilesToTry(profile) {
  if (!profile || profile === 'auto') return PROFILE_ORDER
  return [normalizeGeminiProfile(profile)]
}

function emptyResult(imageData, reason, attemptedProfiles, profile = null, meta = {}) {
  return {
    imageData,
    processed: false,
    confidence: 0,
    position: null,
    reason,
    profile,
    attemptedProfiles,
    decisionTier: meta.decisionTier ?? null,
    meta: meta.validation ?? null,
  }
}

function normalizeAdaptiveMode(adaptiveMode) {
  if (!adaptiveMode || adaptiveMode === 'auto') return 'auto'
  if (adaptiveMode === 'off') return 'off'
  return 'auto'
}

function copyImageData(target, source) {
  target.data.set(source.data)
}

function processImageWithProfile(imageData, options, profile) {
  const { width, height } = imageData
  const {
    skipDetection = false,
    forcePosition,
    adaptiveMode = 'auto',
  } = options
  const useValidation = normalizeAdaptiveMode(adaptiveMode) === 'auto' && !skipDetection && !forcePosition

  const info = getGeminiWatermarkInfo(width, height, profile)
  if (!info) {
    return emptyResult(imageData, 'image_too_small', [profile], profile)
  }

  const alphaMapEntry = getGeminiAlphaMap(info.alphaMapKey)
  if (!alphaMapEntry) {
    return emptyResult(imageData, 'missing_alpha_map', [profile], profile)
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

    const match = findWatermarkPosition(imageData, mask, info.position)
    if (!match) {
      return emptyResult(imageData, 'watermark_not_detected', [profile], profile)
    }

    confidence = match.confidence
    position = {
      x: match.x,
      y: match.y,
      width: alphaMapEntry.width,
      height: alphaMapEntry.height,
    }
  }

  const workingCopy = cloneImageData(imageData)
  removeWatermark(workingCopy, alphaMapEntry.data, position)

  let decisionTier = skipDetection || forcePosition ? 'ncc_only' : 'ncc_only'
  let validationMeta = null

  if (useValidation) {
    const preRemovalNcc = computeNCC(
      imageData.data,
      width,
      position.x,
      position.y,
      alphaMapEntry.data,
      alphaMapEntry.width,
      alphaMapEntry.height,
      2,
    )
    const validation = validateRestoration(
      imageData,
      workingCopy,
      position,
      alphaMapEntry.data,
      preRemovalNcc,
    )
    validationMeta = validation

    if (!validation.valid) {
      return emptyResult(
        imageData,
        'restoration_rejected',
        [profile],
        profile,
        { decisionTier: validation.decisionTier, validation },
      )
    }
    decisionTier = validation.decisionTier
  }

  copyImageData(imageData, workingCopy)

  return {
    imageData,
    processed: true,
    confidence,
    position,
    profile,
    attemptedProfiles: [profile],
    decisionTier,
    meta: validationMeta,
  }
}

/**
 * Process a single image to remove the Gemini watermark.
 *
 * @param {ImageData} imageData - The watermarked image (mutated in place)
 * @param {{ skipDetection?: boolean, forcePosition?: { x: number, y: number }, profile?: 'auto'|'current'|'legacy'|'v1'|'v2' }} options
 * @returns {{ imageData: ImageData, processed: boolean, confidence: number, position: { x: number, y: number, width: number, height: number }|null, profile: string|null, attemptedProfiles: string[], reason?: string }}
 */
export function processImage(imageData, options = {}) {
  const profile = options.profile ?? 'auto'
  const profilesToTry = getProfilesToTry(profile)
  const maxPasses = Math.max(1, options.maxPasses ?? DEFAULT_MAX_PASSES)
  const attemptedProfiles = []
  let lastResult = null
  let passCount = 0

  for (const activeProfile of profilesToTry) {
    if (passCount >= maxPasses) break

    attemptedProfiles.push(activeProfile)
    passCount++
    const result = processImageWithProfile(imageData, options, activeProfile)
    result.attemptedProfiles = [...attemptedProfiles]

    if (result.processed) return result
    lastResult = result

    if (result.reason !== 'watermark_not_detected' && result.reason !== 'restoration_rejected') break
  }

  return {
    ...(lastResult || emptyResult(imageData, 'watermark_not_detected', attemptedProfiles)),
    attemptedProfiles,
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
  const cachedByProfile = new Map()

  if (targetWidth && targetHeight) {
    for (const profile of PROFILE_ORDER) {
      const info = getGeminiWatermarkInfo(targetWidth, targetHeight, profile)
      if (info) {
        cachedByProfile.set(profile, {
          info,
          alphaMap: getGeminiAlphaMap(info.alphaMapKey),
        })
      }
    }
  }

  return {
    /**
     * Process an image to remove the Gemini watermark.
     * @param {ImageData} imageData
     * @param {{ skipDetection?: boolean, forcePosition?: { x: number, y: number }, profile?: 'auto'|'current'|'legacy'|'v1'|'v2' }} options
     */
    process(imageData, options = {}) {
      // Use cached config if dimensions match, otherwise dynamic lookup
      if (cachedByProfile.size > 0 && imageData.width === targetWidth && imageData.height === targetHeight) {
        const profilesToTry = getProfilesToTry(options.profile ?? 'auto')
        const attemptedProfiles = []
        let lastResult = null

        for (const profile of profilesToTry) {
          attemptedProfiles.push(profile)
          const cached = cachedByProfile.get(profile)

          if (!cached?.info) {
            lastResult = emptyResult(imageData, 'image_too_small', [...attemptedProfiles], profile)
            break
          }

          if (!cached.alphaMap) {
            lastResult = emptyResult(imageData, 'missing_alpha_map', [...attemptedProfiles], profile)
            break
          }

          const result = processImageWithProfile(imageData, options, profile)
          result.attemptedProfiles = [...attemptedProfiles]

          if (result.processed) return result
          lastResult = result

          if (result.reason !== 'watermark_not_detected' && result.reason !== 'restoration_rejected') break
        }

        return {
          ...(lastResult || emptyResult(imageData, 'watermark_not_detected', attemptedProfiles)),
          attemptedProfiles,
        }
      }

      // Fallback to full dynamic processing
      return processImage(imageData, options)
    },
  }
}

export { findWatermarkPosition, computeNCC }
