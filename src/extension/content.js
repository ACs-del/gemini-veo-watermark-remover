'use strict';

/**
 * Gemini & Veo Watermark Remover — Content Script
 *
 * Observes the Gemini / AI Studio DOM for generated images, then applies
 * watermark removal entirely on the client via reverse alpha blending.
 *
 * Algorithm overview:
 *   1. Detect watermark tier (48×48 or 96×96) based on image dimensions
 *   2. NCC template-match an alpha mask against the bottom-right region
 *   3. Reverse-blend: original = (watermarked − α×255) / (1 − α)
 *   4. Replace the <img> src with the cleaned data URL
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let gvwrEnabled = true;
const processedImages = new WeakSet();

// ---------------------------------------------------------------------------
// Alpha-map placeholder
// ---------------------------------------------------------------------------

/**
 * Generate a sparkle/diamond pattern approximation of the Gemini logo.
 * This is a geometric placeholder — replace with real calibrated data
 * extracted from actual Gemini watermark samples for production use.
 *
 * TODO: Replace this function body with a base64-encoded Float32Array
 *       derived from calibrated PNG alpha masks. The placeholder produces
 *       a 4-pointed star shape that approximates the watermark geometry.
 */
function generatePlaceholderAlphaMap(size) {
  const map = new Float32Array(size * size);
  const center = size / 2;
  const radius = size * 0.38;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / radius;
      const dy = (y - center) / radius;

      const diamondDist = Math.abs(dx) + Math.abs(dy);
      const circularDist = Math.sqrt(dx * dx + dy * dy);

      const starFactor = Math.max(0, 1 - diamondDist * 0.85);
      const circleFactor = Math.max(0, 1 - circularDist * 1.2);

      let alpha = Math.max(starFactor * 0.7, circleFactor * 0.5);
      alpha *= Math.max(0, 1 - circularDist * 0.9);

      const centralDist = circularDist * 2.5;
      if (centralDist < 1) {
        alpha = Math.max(alpha, (1 - centralDist) * 0.65);
      }

      map[y * size + x] = Math.max(0, Math.min(0.75, alpha));
    }
  }

  return map;
}

// Pre-build both tiers
const ALPHA_MAPS = {
  48: { data: generatePlaceholderAlphaMap(48), width: 48, height: 48 },
  96: { data: generatePlaceholderAlphaMap(96), width: 96, height: 96 },
};

// ---------------------------------------------------------------------------
// Watermark config detection
// ---------------------------------------------------------------------------

const LARGE_IMAGE_THRESHOLD = 1024;

/**
 * Returns watermark tier config for the given image dimensions, or null if
 * the image is too small to contain a watermark.
 */
function getWatermarkConfig(width, height) {
  const isSmall = width <= LARGE_IMAGE_THRESHOLD && height <= LARGE_IMAGE_THRESHOLD;
  const size = isSmall ? 48 : 96;
  const margin = isSmall ? 32 : 64;

  if (width < size + margin || height < size + margin) return null;

  return {
    size,
    margin,
    expectedX: width - margin - size,
    expectedY: height - margin - size,
  };
}

// ---------------------------------------------------------------------------
// NCC template matching
// ---------------------------------------------------------------------------

/**
 * Normalized Cross-Correlation between an image region and the alpha mask.
 *
 * We correlate pixel brightness with mask alpha — the watermark adds a
 * white overlay proportional to alpha, so higher-than-expected brightness
 * at high-alpha positions yields a strong positive correlation.
 *
 * @param {Uint8ClampedArray} imgData  RGBA pixel buffer
 * @param {number}            imgW     Image width
 * @param {number}            x        Region origin X
 * @param {number}            y        Region origin Y
 * @param {Float32Array}      mask     Alpha map values
 * @param {number}            maskW    Mask width
 * @param {number}            maskH    Mask height
 * @param {number}            step     Sampling step (1 = full, 2 = half)
 * @returns {number} NCC score ∈ [0, 1]
 */
function computeNCC(imgData, imgW, x, y, mask, maskW, maskH, step) {
  let sumImg = 0, sumMask = 0;
  let sumImgSq = 0, sumMaskSq = 0;
  let sumProduct = 0;
  let count = 0;

  for (let my = 0; my < maskH; my += step) {
    for (let mx = 0; mx < maskW; mx += step) {
      const alpha = mask[my * maskW + mx];
      if (alpha < 0.01) continue;

      const idx = ((y + my) * imgW + (x + mx)) * 4;
      const brightness = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;

      sumImg += brightness;
      sumMask += alpha;
      sumImgSq += brightness * brightness;
      sumMaskSq += alpha * alpha;
      sumProduct += brightness * alpha;
      count++;
    }
  }

  if (count < 10) return 0;

  const meanImg = sumImg / count;
  const meanMask = sumMask / count;
  const numerator = sumProduct / count - meanImg * meanMask;
  const denomImg = Math.sqrt(Math.max(0, sumImgSq / count - meanImg * meanImg));
  const denomMask = Math.sqrt(Math.max(0, sumMaskSq / count - meanMask * meanMask));

  if (denomImg < 1e-6 || denomMask < 1e-6) return 0;

  return Math.max(0, numerator / (denomImg * denomMask));
}

const NCC_THRESHOLD = 0.5;

/**
 * Two-pass NCC search: coarse (step=2) then fine (step=1) refinement.
 * Returns the best match position or null if below threshold.
 */
function findWatermarkPosition(imageData, maskEntry) {
  const { width: imgW, height: imgH, data: imgData } = imageData;
  const { data: maskAlpha, width: maskW, height: maskH } = maskEntry;

  const margin = maskW === 96 ? 64 : 32;
  const expectedX = imgW - margin - maskW;
  const expectedY = imgH - margin - maskH;
  const searchRadius = Math.max(16, Math.round(maskW * 0.75));

  const startX = Math.max(0, expectedX - searchRadius);
  const startY = Math.max(0, expectedY - searchRadius);
  const endX = Math.min(imgW - maskW, expectedX + searchRadius);
  const endY = Math.min(imgH - maskH, expectedY + searchRadius);

  let bestX = 0, bestY = 0, bestScore = -1;

  // Coarse pass
  for (let cy = startY; cy <= endY; cy += 2) {
    for (let cx = startX; cx <= endX; cx += 2) {
      const score = computeNCC(imgData, imgW, cx, cy, maskAlpha, maskW, maskH, 2);
      if (score > bestScore) { bestScore = score; bestX = cx; bestY = cy; }
    }
  }

  // Fine pass around best coarse result
  const fineStartX = Math.max(0, bestX - 2);
  const fineStartY = Math.max(0, bestY - 2);
  const fineEndX = Math.min(endX, bestX + 2);
  const fineEndY = Math.min(endY, bestY + 2);

  for (let fy = fineStartY; fy <= fineEndY; fy++) {
    for (let fx = fineStartX; fx <= fineEndX; fx++) {
      const score = computeNCC(imgData, imgW, fx, fy, maskAlpha, maskW, maskH, 1);
      if (score > bestScore) { bestScore = score; bestX = fx; bestY = fy; }
    }
  }

  return bestScore >= NCC_THRESHOLD
    ? { x: bestX, y: bestY, confidence: bestScore }
    : null;
}

// ---------------------------------------------------------------------------
// Reverse alpha blending
// ---------------------------------------------------------------------------

const ALPHA_THRESHOLD = 0.002;
const MAX_ALPHA = 0.99;

/**
 * Mutate imageData in-place: undo the white watermark overlay.
 *
 *   original = (watermarked − α × 255) / (1 − α)
 */
function removeWatermark(imageData, alphaMap, position) {
  const { data, width } = imageData;
  const { x: ox, y: oy, width: mw, height: mh } = position;

  for (let my = 0; my < mh; my++) {
    for (let mx = 0; mx < mw; mx++) {
      const alpha = alphaMap[my * mw + mx];
      if (alpha < ALPHA_THRESHOLD) continue;

      const effectiveAlpha = Math.min(alpha, MAX_ALPHA);
      const px = ox + mx;
      const py = oy + my;

      if (px < 0 || px >= width || py < 0 || py >= imageData.height) continue;

      const idx = (py * width + px) * 4;

      for (let c = 0; c < 3; c++) {
        const watermarked = data[idx + c];
        const original = (watermarked - effectiveAlpha * 255) / (1 - effectiveAlpha);
        data[idx + c] = Math.max(0, Math.min(255, Math.round(original)));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Image processing pipeline
// ---------------------------------------------------------------------------

/**
 * Full pipeline: detect → match → remove → return cleaned data URL.
 * Returns null if the image doesn't appear to contain a watermark.
 */
function processImageData(imageData) {
  const { width, height } = imageData;
  const config = getWatermarkConfig(width, height);
  if (!config) return null;

  const maskEntry = ALPHA_MAPS[config.size];
  if (!maskEntry) return null;

  const match = findWatermarkPosition(imageData, maskEntry);
  if (!match) return null;

  const position = {
    x: match.x,
    y: match.y,
    width: maskEntry.width,
    height: maskEntry.height,
  };

  removeWatermark(imageData, maskEntry.data, position);

  return { imageData, confidence: match.confidence, position };
}

/**
 * Load an image URL into a canvas, run the removal pipeline, and return a
 * cleaned data URL. Operates entirely in-memory via OffscreenCanvas when
 * available, falling back to a hidden DOM canvas.
 */
async function cleanImage(imgUrl) {
  const response = await fetch(imgUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const w = bitmap.width;
  const h = bitmap.height;

  let canvas, ctx;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(w, h);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    ctx = canvas.getContext('2d');
  }

  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);

  const result = processImageData(imageData);
  if (!result) return null;

  ctx.putImageData(result.imageData, 0, 0);

  // OffscreenCanvas uses convertToBlob; regular canvas uses toDataURL
  if (canvas instanceof OffscreenCanvas) {
    const cleanedBlob = await canvas.convertToBlob({ type: 'image/png' });
    return URL.createObjectURL(cleanedBlob);
  }
  return canvas.toDataURL('image/png');
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

/**
 * Heuristic: is this <img> likely a Gemini-generated image?
 * We look for images inside the chat response area that are reasonably sized
 * and not UI elements (avatars, icons, etc.).
 */
function isGeminiGeneratedImage(img) {
  if (img.naturalWidth < 128 || img.naturalHeight < 128) return false;

  // Skip tiny display images (icons, avatars)
  const rect = img.getBoundingClientRect();
  if (rect.width < 64 || rect.height < 64) return false;

  // Gemini hosts generated images on these domains
  const src = img.src || '';
  if (
    src.includes('lh3.googleusercontent.com') ||
    src.includes('gstatic.com') ||
    src.startsWith('blob:') ||
    src.startsWith('data:image/')
  ) {
    return true;
  }

  // Fallback: large images inside message containers are likely generated
  const messageContainer = img.closest(
    '[data-message-id], .response-container, .model-response, .chat-message',
  );
  return messageContainer !== null;
}

/**
 * Add a subtle "Cleaned" badge to a processed image.
 */
function addCleanedBadge(img) {
  if (img.parentElement?.querySelector('.gvwr-badge')) return;

  const wrapper = img.parentElement;
  if (!wrapper) return;

  // Ensure the parent is positioned so the badge can be absolutely placed
  const pos = getComputedStyle(wrapper).position;
  if (pos === 'static') wrapper.style.position = 'relative';

  const badge = document.createElement('div');
  badge.className = 'gvwr-badge';
  badge.textContent = '✓ Cleaned';
  Object.assign(badge.style, {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: '11px',
    fontFamily: 'system-ui, sans-serif',
    padding: '3px 8px',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '10',
    backdropFilter: 'blur(4px)',
    lineHeight: '1.4',
  });

  wrapper.appendChild(badge);
}

// ---------------------------------------------------------------------------
// Image observer & processing
// ---------------------------------------------------------------------------

/**
 * Attempt to process a single <img> element. Skips already-processed images
 * and images that don't look like Gemini outputs.
 */
async function handleImage(img) {
  if (!gvwrEnabled) return;
  if (processedImages.has(img)) return;

  // Mark immediately to prevent duplicate processing on rapid mutations
  processedImages.add(img);

  // Wait for natural dimensions to be available
  if (!img.naturalWidth) {
    await new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      // Safety timeout so we don't wait forever
      setTimeout(resolve, 5000);
    });
  }

  if (!isGeminiGeneratedImage(img)) return;

  try {
    const cleanedUrl = await cleanImage(img.src);
    if (!cleanedUrl) return;

    // Store the original src for potential undo / comparison
    img.dataset.gvwrOriginal = img.src;
    img.src = cleanedUrl;
    img.dataset.gvwrCleaned = 'true';

    addCleanedBadge(img);

    // Notify background to increment counters
    chrome.runtime.sendMessage({ type: 'gvwr-image-cleaned' }).catch(() => {});
  } catch (err) {
    console.warn('[GVWR] Failed to process image:', err);
    // Don't block the page — silently skip this image
  }
}

/**
 * Scan the current document for any un-processed images.
 */
function scanExistingImages() {
  const images = document.querySelectorAll('img');
  for (const img of images) {
    handleImage(img);
  }
}

// ---------------------------------------------------------------------------
// Download / copy interception
// ---------------------------------------------------------------------------

/**
 * Intercept right-click → "Save image as" and clipboard copy events so the
 * user always gets the cleaned version (already swapped into <img>.src).
 *
 * For programmatic download links (<a download>), we swap the href if the
 * linked image has been cleaned.
 */
function interceptDownloads() {
  // Patch anchor clicks pointing to original (un-cleaned) URLs
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[download], a[href*="googleusercontent"]');
    if (!anchor) return;

    const href = anchor.href;
    // Find a cleaned image whose original matches this href
    const cleaned = document.querySelector(`img[data-gvwr-original="${CSS.escape(href)}"]`);
    if (cleaned?.dataset.gvwrCleaned) {
      anchor.href = cleaned.src;
    }
  }, true);
}

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'gvwr-toggle') {
    gvwrEnabled = message.enabled;

    if (gvwrEnabled) {
      scanExistingImages();
    }
  }
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

(async function init() {
  // Fetch current enabled state from storage
  try {
    const response = await chrome.runtime.sendMessage({ type: 'gvwr-get-state' });
    if (response) gvwrEnabled = response.enabled;
  } catch {
    // Extension context may not be ready yet — default to enabled
  }

  if (!gvwrEnabled) return;

  // Process images already in the DOM
  scanExistingImages();

  // Watch for new images injected by Gemini's SPA renderer
  const observer = new MutationObserver((mutations) => {
    if (!gvwrEnabled) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        if (node.tagName === 'IMG') {
          handleImage(node);
        } else {
          // Could be a container that includes images
          const imgs = node.querySelectorAll?.('img');
          if (imgs) {
            for (const img of imgs) handleImage(img);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  interceptDownloads();
})();
