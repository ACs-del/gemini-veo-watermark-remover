/**
 * Post-removal validation metrics for Gemini image watermark removal.
 * Rejects false-positive detections before committing pixel changes.
 */

const HALO_MIN_ALPHA = 0.12
const HALO_MAX_ALPHA = 0.35
const HALO_OUTSIDE_ALPHA_MAX = 0.01
const HALO_OUTER_MARGIN = 3
const MIN_HALO_VISIBILITY = 0.35
const MAX_RESIDUAL_NCC_RATIO = 0.55
const NEAR_BLACK_THRESHOLD = 5

/**
 * Deep-clone ImageData-like object.
 * @param {{ width: number, height: number, data: Uint8ClampedArray }} imageData
 */
export function cloneImageData(imageData) {
  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8ClampedArray(imageData.data),
  }
}

/**
 * Measure how much brighter the watermark band is vs surrounding pixels on the original.
 * Real Gemini overlays produce a visible halo before removal.
 */
export function assessAlphaBandHalo(imageData, position, alphaMap) {
  let bandSum = 0
  let bandSq = 0
  let bandCount = 0
  let outerSum = 0
  let outerSq = 0
  let outerCount = 0

  for (let row = -HALO_OUTER_MARGIN; row < position.height + HALO_OUTER_MARGIN; row++) {
    for (let col = -HALO_OUTER_MARGIN; col < position.width + HALO_OUTER_MARGIN; col++) {
      const pixelX = position.x + col
      const pixelY = position.y + row
      if (pixelX < 0 || pixelY < 0 || pixelX >= imageData.width || pixelY >= imageData.height) {
        continue
      }

      const idx = (pixelY * imageData.width + pixelX) * 4
      const lum = 0.2126 * imageData.data[idx]
        + 0.7152 * imageData.data[idx + 1]
        + 0.0722 * imageData.data[idx + 2]

      const inside = row >= 0 && col >= 0 && row < position.height && col < position.width
      const alpha = inside ? alphaMap[row * position.width + col] : 0

      if (inside && alpha >= HALO_MIN_ALPHA && alpha <= HALO_MAX_ALPHA) {
        bandSum += lum
        bandSq += lum * lum
        bandCount++
        continue
      }

      if (!inside || alpha <= HALO_OUTSIDE_ALPHA_MAX) {
        outerSum += lum
        outerSq += lum * lum
        outerCount++
      }
    }
  }

  const bandMean = bandCount > 0 ? bandSum / bandCount : 0
  const outerMean = outerCount > 0 ? outerSum / outerCount : 0
  const outerStd = outerCount > 0
    ? Math.sqrt(Math.max(0, outerSq / outerCount - outerMean * outerMean))
    : 1

  const deltaLum = bandMean - outerMean
  const visibility = deltaLum / Math.max(1, outerStd)

  return { bandCount, outerCount, deltaLum, visibility }
}

/** Ratio of near-black pixels inside the watermark region after restoration. */
export function calculateNearBlackRatio(imageData, position) {
  let nearBlack = 0
  let total = 0

  for (let row = 0; row < position.height; row++) {
    for (let col = 0; col < position.width; col++) {
      const idx = ((position.y + row) * imageData.width + (position.x + col)) * 4
      const r = imageData.data[idx]
      const g = imageData.data[idx + 1]
      const b = imageData.data[idx + 2]
      if (r <= NEAR_BLACK_THRESHOLD && g <= NEAR_BLACK_THRESHOLD && b <= NEAR_BLACK_THRESHOLD) {
        nearBlack++
      }
      total++
    }
  }

  return total > 0 ? nearBlack / total : 0
}

/**
 * Lightweight NCC on restored region — residual should drop after valid removal.
 */
function computeRegionNCC(imgData, imgW, position, alphaMap, step = 2) {
  let sumImg = 0
  let sumMask = 0
  let sumImgSq = 0
  let sumMaskSq = 0
  let sumProduct = 0
  let count = 0
  const { x, y, width: maskW, height: maskH } = position

  for (let my = 0; my < maskH; my += step) {
    for (let mx = 0; mx < maskW; mx += step) {
      const alpha = alphaMap[my * maskW + mx]
      if (alpha < 0.01) continue

      const idx = ((y + my) * imgW + (x + mx)) * 4
      const brightness = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3
      sumImg += brightness
      sumMask += alpha
      sumImgSq += brightness * brightness
      sumMaskSq += alpha * alpha
      sumProduct += brightness * alpha
      count++
    }
  }

  if (count < 10) return 0

  const meanImg = sumImg / count
  const meanMask = sumMask / count
  const numerator = (sumProduct / count) - (meanImg * meanMask)
  const denomImg = Math.sqrt(Math.max(0, (sumImgSq / count) - meanImg * meanImg))
  const denomMask = Math.sqrt(Math.max(0, (sumMaskSq / count) - meanMask * meanMask))

  if (denomImg < 1e-6 || denomMask < 1e-6) return 0
  return Math.max(0, numerator / (denomImg * denomMask))
}

/**
 * Validate that reverse alpha removal improved the watermark region without artifacts.
 *
 * @returns {{ valid: boolean, decisionTier: string, haloVisibility: number, residualNccRatio: number, nearBlackRatio: number }}
 */
export function validateRestoration(originalImageData, restoredImageData, position, alphaMap, preRemovalNcc) {
  const halo = assessAlphaBandHalo(originalImageData, position, alphaMap)
  const nearBlackRatio = calculateNearBlackRatio(restoredImageData, position)
  const postNcc = computeRegionNCC(restoredImageData.data, restoredImageData.width, position, alphaMap)
  const residualNccRatio = preRemovalNcc > 0 ? postNcc / preRemovalNcc : postNcc

  // Original must show watermark-like halo; restored region must not collapse to black.
  const haloOk = halo.bandCount >= 8 && halo.visibility >= MIN_HALO_VISIBILITY
  const residualOk = postNcc < 0.35 || residualNccRatio <= MAX_RESIDUAL_NCC_RATIO
  const noDarkHole = nearBlackRatio < 0.35

  const valid = haloOk && residualOk && noDarkHole

  return {
    valid,
    decisionTier: valid ? 'validated' : 'rejected',
    haloVisibility: halo.visibility,
    residualNccRatio,
    nearBlackRatio,
  }
}
