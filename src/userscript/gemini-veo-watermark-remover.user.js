// ==UserScript==
// @name         Gemini & Veo Watermark Remover
// @namespace    https://removegeminiwatermark.io
// @version      0.1.0
// @description  Automatically removes visible watermarks from Gemini-generated images on Gemini pages. 100% local processing.
// @author       ACs-del
// @match        https://gemini.google.com/*
// @match        https://aistudio.google.com/*
// @grant        none
// @license      MIT
// @homepageURL  https://removegeminiwatermark.io
// @supportURL   https://github.com/ACs-del/gemini-veo-watermark-remover/issues
// @downloadURL  https://removegeminiwatermark.io/userscript/gemini-veo-watermark-remover.user.js
// @updateURL    https://removegeminiwatermark.io/userscript/gemini-veo-watermark-remover.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────────────
  const PROCESSED_ATTR = 'data-gvwr-processed';
  const MIN_IMAGE_DIM = 100;
  const LARGE_IMAGE_THRESHOLD = 1024;
  const NCC_CONFIDENCE_THRESHOLD = 0.5;
  const ALPHA_THRESHOLD = 0.002;
  const MAX_ALPHA = 0.99;
  const OBSERVER_DEBOUNCE_MS = 300;
  const INDICATOR_AUTO_HIDE_MS = 5000;
  const CSS_PREFIX = 'gvwr-';

  // ─── Watermark tier configuration ────────────────────────────────────
  const WATERMARK_TIERS = {
    small: { size: 48, margin: 32, alphaMapKey: 'gemini-48' },
    large: { size: 96, margin: 64, alphaMapKey: 'gemini-96' },
  };

  // ─── Embedded Alpha Maps ────────────────────────────────────────────
  //
  // PLACEHOLDER: Replace with real calibrated alpha map data.
  // Real maps should be extracted from gemini-alpha-48.png / gemini-alpha-96.png
  // by reading each pixel's red channel brightness and dividing by 255.
  //
  // The placeholder generates a synthetic Gemini-like diamond/sparkle pattern
  // that approximates the geometric structure of the real watermark logo.

  const alphaMapCache = new Map();

  /**
   * Generate a synthetic Gemini sparkle/diamond pattern.
   * The Gemini logo is a 4-pointed star — this approximates its geometry
   * so the NCC matching can locate the correct region even with placeholder data.
   */
  function generateGeminiSparklePattern(size) {
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

  function getAlphaMap(key) {
    if (alphaMapCache.has(key)) return alphaMapCache.get(key);

    const size = key === 'gemini-48' ? 48 : 96;
    const data = generateGeminiSparklePattern(size);
    const entry = { data, width: size, height: size };
    alphaMapCache.set(key, entry);
    return entry;
  }

  // ─── Watermark Detection ─────────────────────────────────────────────

  function getWatermarkTier(width, height) {
    return (width <= LARGE_IMAGE_THRESHOLD && height <= LARGE_IMAGE_THRESHOLD)
      ? 'small'
      : 'large';
  }

  function getWatermarkInfo(width, height) {
    const tier = getWatermarkTier(width, height);
    const config = WATERMARK_TIERS[tier];
    const minDim = config.size + config.margin;
    if (width < minDim || height < minDim) return null;

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
    };
  }

  // ─── NCC Template Matching ───────────────────────────────────────────

  function computeNCC(imgData, imgW, x, y, maskAlpha, maskW, maskH, step) {
    let sumImg = 0, sumMask = 0;
    let sumImgSq = 0, sumMaskSq = 0;
    let sumProduct = 0;
    let count = 0;

    for (let my = 0; my < maskH; my += step) {
      for (let mx = 0; mx < maskW; mx += step) {
        const alpha = maskAlpha[my * maskW + mx];
        if (alpha < 0.01) continue;

        const px = x + mx;
        const py = y + my;
        const idx = (py * imgW + px) * 4;

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
    const numerator = (sumProduct / count) - (meanImg * meanMask);
    const denomImg = Math.sqrt(Math.max(0, (sumImgSq / count) - meanImg * meanImg));
    const denomMask = Math.sqrt(Math.max(0, (sumMaskSq / count) - meanMask * meanMask));

    if (denomImg < 1e-6 || denomMask < 1e-6) return 0;

    return Math.max(0, numerator / (denomImg * denomMask));
  }

  /**
   * Two-pass NCC search in the bottom-right corner region:
   * coarse pass (step=2) then fine pass (step=1) around the best match.
   */
  function findWatermarkPosition(imageData, mask) {
    const { width: imgW, height: imgH, data: imgData } = imageData;
    const { width: maskW, height: maskH, alpha: maskAlpha } = mask;

    const margin = maskW === 96 ? 64 : 32;
    const expectedX = imgW - margin - maskW;
    const expectedY = imgH - margin - maskH;
    const searchRadius = Math.max(16, Math.round(maskW * 0.75));

    const searchStartX = Math.max(0, expectedX - searchRadius);
    const searchStartY = Math.max(0, expectedY - searchRadius);
    const searchMaxX = Math.min(imgW - maskW, expectedX + searchRadius);
    const searchMaxY = Math.min(imgH - maskH, expectedY + searchRadius);

    let bestX = 0, bestY = 0, bestScore = -1;

    // Coarse pass
    for (let y = searchStartY; y <= searchMaxY; y += 2) {
      for (let x = searchStartX; x <= searchMaxX; x += 2) {
        const score = computeNCC(imgData, imgW, x, y, maskAlpha, maskW, maskH, 2);
        if (score > bestScore) { bestScore = score; bestX = x; bestY = y; }
      }
    }

    // Fine pass around best coarse match
    const fineStartX = Math.max(0, bestX - 2);
    const fineStartY = Math.max(0, bestY - 2);
    const fineEndX = Math.min(searchMaxX, bestX + 2);
    const fineEndY = Math.min(searchMaxY, bestY + 2);

    for (let y = fineStartY; y <= fineEndY; y++) {
      for (let x = fineStartX; x <= fineEndX; x++) {
        const score = computeNCC(imgData, imgW, x, y, maskAlpha, maskW, maskH, 1);
        if (score > bestScore) { bestScore = score; bestX = x; bestY = y; }
      }
    }

    return bestScore >= NCC_CONFIDENCE_THRESHOLD
      ? { x: bestX, y: bestY, confidence: bestScore }
      : null;
  }

  // ─── Reverse Alpha Blending ──────────────────────────────────────────

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
        const invAlpha = 1 - effectiveAlpha;

        for (let c = 0; c < 3; c++) {
          const watermarked = data[idx + c];
          // Reverse alpha blend: original = (watermarked - alpha * 255) / (1 - alpha)
          const original = (watermarked - effectiveAlpha * 255) / invAlpha;
          data[idx + c] = Math.max(0, Math.min(255, Math.round(original)));
        }
      }
    }

    return imageData;
  }

  // ─── Image Processing Pipeline ──────────────────────────────────────

  /**
   * Full pipeline: fetch image → canvas → detect → remove → data URL.
   * Returns the cleaned data URL or null if processing was skipped.
   */
  async function processImageElement(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Load the image into a temporary Image to get natural dimensions
    const tempImg = await loadImage(img.src);
    const w = tempImg.naturalWidth;
    const h = tempImg.naturalHeight;

    if (w < MIN_IMAGE_DIM || h < MIN_IMAGE_DIM) return null;

    const info = getWatermarkInfo(w, h);
    if (!info) return null;

    const alphaMapEntry = getAlphaMap(info.alphaMapKey);
    if (!alphaMapEntry) return null;

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(tempImg, 0, 0);

    const imageData = ctx.getImageData(0, 0, w, h);

    // NCC template matching
    const mask = {
      width: alphaMapEntry.width,
      height: alphaMapEntry.height,
      alpha: alphaMapEntry.data,
    };
    const match = findWatermarkPosition(imageData, mask);
    if (!match) return null;

    const position = {
      x: match.x,
      y: match.y,
      width: alphaMapEntry.width,
      height: alphaMapEntry.height,
    };

    removeWatermark(imageData, alphaMapEntry.data, position);

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // ─── Visual Feedback ────────────────────────────────────────────────

  function showProcessingOverlay(img) {
    const wrapper = img.parentElement;
    if (!wrapper) return null;

    const overlay = document.createElement('div');
    overlay.className = `${CSS_PREFIX}overlay`;
    overlay.textContent = 'Cleaning...';
    wrapper.style.position = wrapper.style.position || 'relative';
    wrapper.appendChild(overlay);
    return overlay;
  }

  function showCheckmark(img) {
    const wrapper = img.parentElement;
    if (!wrapper) return;

    const badge = document.createElement('div');
    badge.className = `${CSS_PREFIX}badge`;
    badge.textContent = '✓';
    badge.title = 'Watermark removed';
    wrapper.style.position = wrapper.style.position || 'relative';
    wrapper.appendChild(badge);
  }

  // ─── Copy/Download Interception ─────────────────────────────────────

  /**
   * Store cleaned data URLs keyed by original src so we can intercept
   * copy/download operations and deliver cleaned images.
   */
  const cleanedImageMap = new Map();

  function interceptCopyDownload() {
    // Intercept right-click → "Copy image" and Ctrl+C on selected images
    document.addEventListener('copy', (e) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const img = findSelectedImage(selection);
      if (!img) return;

      const cleanedSrc = cleanedImageMap.get(img.dataset.gvwrOriginalSrc) ||
                          cleanedImageMap.get(img.src);
      if (!cleanedSrc) return;

      e.preventDefault();

      // Convert data URL to blob for clipboard
      fetch(cleanedSrc)
        .then(r => r.blob())
        .then(blob => {
          const item = new ClipboardItem({ [blob.type]: blob });
          navigator.clipboard.write([item]).catch(() => {});
        });
    }, true);

    // Intercept link clicks that download images
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a[download], a[href*="blob:"]');
      if (!anchor) return;

      // Check if this download link is associated with a cleaned image
      const nearbyImg = anchor.closest('[class*="message"]')?.querySelector(`img[${PROCESSED_ATTR}]`);
      if (!nearbyImg) return;

      const cleanedSrc = cleanedImageMap.get(nearbyImg.dataset.gvwrOriginalSrc);
      if (!cleanedSrc) return;

      e.preventDefault();
      e.stopPropagation();

      // Trigger download with cleaned image
      const downloadLink = document.createElement('a');
      downloadLink.href = cleanedSrc;
      downloadLink.download = 'gemini-image-cleaned.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
    }, true);
  }

  function findSelectedImage(selection) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
    return el?.querySelector?.(`img[${PROCESSED_ATTR}]`) || el?.closest?.(`img[${PROCESSED_ATTR}]`);
  }

  // ─── DOM Observation ────────────────────────────────────────────────

  let debounceTimer = null;
  const processingQueue = new Set();

  function scanForImages() {
    // Target selectors for Gemini & AI Studio chat message areas
    const selectors = [
      'img[src^="https://"]',
      'img[src^="blob:"]',
      'img[src^="data:image"]',
    ];

    const images = document.querySelectorAll(selectors.join(','));

    for (const img of images) {
      if (img.getAttribute(PROCESSED_ATTR)) continue;
      if (img.naturalWidth < MIN_IMAGE_DIM || img.naturalHeight < MIN_IMAGE_DIM) {
        // Image may not have loaded yet — wait for it
        if (!img.complete) {
          img.addEventListener('load', () => queueImageProcessing(img), { once: true });
          continue;
        }
        // Skip genuinely small images (icons, avatars, etc.)
        if (img.naturalWidth > 0 && img.naturalWidth < MIN_IMAGE_DIM) continue;
        if (img.naturalHeight > 0 && img.naturalHeight < MIN_IMAGE_DIM) continue;
      }

      queueImageProcessing(img);
    }
  }

  async function queueImageProcessing(img) {
    if (img.getAttribute(PROCESSED_ATTR)) return;
    if (processingQueue.has(img)) return;

    processingQueue.add(img);

    // Mark early to prevent duplicate processing
    img.setAttribute(PROCESSED_ATTR, 'pending');

    const overlay = showProcessingOverlay(img);

    try {
      // Store original src before replacement
      const originalSrc = img.src;
      const cleanedDataUrl = await processImageElement(img);

      if (cleanedDataUrl) {
        img.dataset.gvwrOriginalSrc = originalSrc;
        img.src = cleanedDataUrl;
        img.setAttribute(PROCESSED_ATTR, 'true');
        cleanedImageMap.set(originalSrc, cleanedDataUrl);
        showCheckmark(img);
      } else {
        img.setAttribute(PROCESSED_ATTR, 'skipped');
      }
    } catch (err) {
      console.warn('[GVWR] Failed to process image:', err);
      img.setAttribute(PROCESSED_ATTR, 'error');
    } finally {
      overlay?.remove();
      processingQueue.delete(img);
    }
  }

  function debouncedScan() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanForImages, OBSERVER_DEBOUNCE_MS);
  }

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      let hasRelevantChange = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            if (node.tagName === 'IMG' || node.querySelector?.('img')) {
              hasRelevantChange = true;
              break;
            }
          }
        }
        if (hasRelevantChange) break;
      }

      if (hasRelevantChange) debouncedScan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return observer;
  }

  // ─── Floating Indicator ─────────────────────────────────────────────

  function showActiveIndicator() {
    const indicator = document.createElement('div');
    indicator.className = `${CSS_PREFIX}indicator`;
    indicator.textContent = '🔧 Watermark Remover Active';
    document.body.appendChild(indicator);

    // Fade in
    requestAnimationFrame(() => {
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateY(0)';
    });

    // Auto-hide after delay
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(8px)';
      setTimeout(() => indicator.remove(), 400);
    }, INDICATOR_AUTO_HIDE_MS);
  }

  // ─── Styles ─────────────────────────────────────────────────────────

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .${CSS_PREFIX}overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.35);
        color: #fff;
        font: 600 13px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        letter-spacing: 0.03em;
        border-radius: inherit;
        z-index: 10;
        pointer-events: none;
        backdrop-filter: blur(2px);
      }

      .${CSS_PREFIX}badge {
        position: absolute;
        bottom: 6px;
        right: 6px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #22c55e;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        z-index: 10;
        pointer-events: none;
        opacity: 0;
        animation: ${CSS_PREFIX}fade-in 0.3s ease forwards;
      }

      .${CSS_PREFIX}indicator {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 16px;
        background: rgba(30, 30, 30, 0.9);
        color: #e5e5e5;
        font: 500 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 100000;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
      }

      @keyframes ${CSS_PREFIX}fade-in {
        from { opacity: 0; transform: scale(0.8); }
        to   { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Initialization ─────────────────────────────────────────────────

  function init() {
    injectStyles();
    showActiveIndicator();
    interceptCopyDownload();

    // Initial scan for any images already on the page
    scanForImages();

    // Watch for dynamically loaded chat messages
    startObserver();

    console.log('[GVWR] Gemini & Veo Watermark Remover v0.1.0 active');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
