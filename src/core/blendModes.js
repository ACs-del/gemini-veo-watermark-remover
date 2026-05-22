/**
 * Core reverse alpha blending algorithm.
 * Formula: original = (watermarked - α × 255) / (1 - α)
 */

const ALPHA_NOISE_FLOOR = 3 / 255;
const ALPHA_THRESHOLD = 0.002;
const MAX_ALPHA = 0.99;

/**
 * Remove watermark from an ImageData region using a pre-calibrated alpha map.
 *
 * @param {ImageData} imageData - The watermarked image data
 * @param {Float32Array} alphaMap - Alpha map (width × height float values 0-1)
 * @param {{ x: number, y: number, width: number, height: number }} position - Watermark region
 * @param {{ clampOutput?: boolean }} options
 * @returns {ImageData} Modified imageData (mutated in place and returned)
 */
export function removeWatermark(imageData, alphaMap, position, options = {}) {
  const { clampOutput = true } = options;
  const { data, width } = imageData;
  const { x: ox, y: oy, width: mw, height: mh } = position;

  for (let my = 0; my < mh; my++) {
    for (let mx = 0; mx < mw; mx++) {
      const alpha = alphaMap[my * mw + mx];

      // Skip pixels below noise floor
      if (alpha < ALPHA_THRESHOLD) continue;

      const effectiveAlpha = Math.min(alpha, MAX_ALPHA);
      const px = ox + mx;
      const py = oy + my;

      if (px < 0 || px >= width || py < 0 || py >= imageData.height) continue;

      const idx = (py * width + px) * 4;

      for (let c = 0; c < 3; c++) {
        const watermarked = data[idx + c];
        // Reverse alpha blend: original = (watermarked - alpha * 255) / (1 - alpha)
        let original = (watermarked - effectiveAlpha * 255) / (1 - effectiveAlpha);

        if (clampOutput) {
          original = Math.max(0, Math.min(255, Math.round(original)));
        }
        data[idx + c] = original;
      }
      // Alpha channel unchanged
    }
  }

  return imageData;
}

/**
 * Apply a synthetic watermark to imageData (for testing/demo).
 */
export function applySyntheticWatermark(imageData, alphaMap, position) {
  const { data, width } = imageData;
  const { x: ox, y: oy, width: mw, height: mh } = position;

  for (let my = 0; my < mh; my++) {
    for (let mx = 0; mx < mw; mx++) {
      const alpha = alphaMap[my * mw + mx];
      if (alpha < ALPHA_NOISE_FLOOR) continue;

      const px = ox + mx;
      const py = oy + my;
      if (px < 0 || px >= width || py < 0 || py >= imageData.height) continue;

      const idx = (py * width + px) * 4;

      for (let c = 0; c < 3; c++) {
        // Forward alpha blend: result = original * (1 - alpha) + watermarkColor * alpha
        // Watermark color is white (255)
        data[idx + c] = Math.round(data[idx + c] * (1 - alpha) + 255 * alpha);
      }
    }
  }

  return imageData;
}

/**
 * Compute spatial correlation of a region to validate it contains a watermark.
 */
export function computeRegionSpatialCorrelation(imageData, position) {
  const { data, width } = imageData;
  const { x: ox, y: oy, width: mw, height: mh } = position;

  let sumDiff = 0;
  let count = 0;

  for (let my = 1; my < mh - 1; my++) {
    for (let mx = 1; mx < mw - 1; mx++) {
      const px = ox + mx;
      const py = oy + my;
      const idx = (py * width + px) * 4;
      const idxRight = (py * width + px + 1) * 4;
      const idxBelow = ((py + 1) * width + px) * 4;

      for (let c = 0; c < 3; c++) {
        sumDiff += Math.abs(data[idx + c] - data[idxRight + c]);
        sumDiff += Math.abs(data[idx + c] - data[idxBelow + c]);
      }
      count += 6;
    }
  }

  return count > 0 ? sumDiff / count : 0;
}
