/**
 * Browser SDK entry point.
 * Optimized for browser usage with WebCodecs priority.
 */

// Veo video exports
export { removeWatermark } from '../core/blendModes.js'
export { processFrame, createFrameProcessor } from '../core/frameProcessor.js'
export { getVeoWatermarkInfo } from '../core/veoConfig.js'
export { getEmbeddedAlphaMap, registerAlphaMap } from '../core/embeddedAlphaMaps.js'
export { processVideo } from '../video/pipeline.browser.js'

// Gemini image exports
export { processImage, createImageProcessor } from '../core/gemini/imageProcessor.js'
export { getGeminiWatermarkInfo, GEMINI_WATERMARK_PROFILES } from '../core/gemini/geminiConfig.js'
export { getGeminiAlphaMap, registerGeminiAlphaMap } from '../core/gemini/geminiAlphaMaps.js'

/**
 * Browser-specific helper: process a video File and return a downloadable Blob.
 *
 * @param {File} file - Video file from <input> or drag-drop
 * @param {{ onProgress?: (current: number, total: number) => void }} options
 * @returns {Promise<Blob>} Processed MP4 blob
 */
export async function processVideoFile(file, options = {}) {
  const { processVideo } = await import('../video/pipeline.browser.js')
  return processVideo(file, { environment: 'browser', ...options })
}

/**
 * Browser-specific helper: process a single image and return cleaned ImageData.
 */
export { processFrame as processImageFrame } from '../core/frameProcessor.js'

/**
 * Browser-specific helper: remove Gemini watermark from an image File/Blob.
 * Handles Canvas decoding, processing, and re-encoding automatically.
 *
 * @param {File|Blob} file - Image file (PNG, JPEG, WebP, etc.)
 * @param {{ quality?: number, format?: string, skipDetection?: boolean, profile?: 'auto'|'current'|'legacy'|'v1'|'v2' }} options
 * @returns {Promise<{ blob: Blob, width: number, height: number, detected: boolean, confidence: number, status: string, profile?: string|null, attemptedProfiles?: string[] }>}
 */
export async function removeGeminiWatermark(file, options = {}) {
  const { quality = 0.95, format = 'image/png', skipDetection = false, profile = 'auto' } = options

  // Decode image file to ImageData via Canvas
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const imageData = ctx.getImageData(0, 0, width, height)

  // Process the image
  const { processImage } = await import('../core/gemini/imageProcessor.js')
  const result = processImage(imageData, { skipDetection, profile })

  if (!result.processed) {
    return {
      blob: file instanceof Blob ? file : new Blob([file]),
      width,
      height,
      detected: false,
      confidence: 0,
      status: result.reason || 'not_processed',
      profile: result.profile,
      attemptedProfiles: result.attemptedProfiles,
    }
  }

  // Write processed pixels back to canvas and encode
  ctx.putImageData(result.imageData, 0, 0)
  const outputBlob = await canvas.convertToBlob({ type: format, quality })

  return {
    blob: outputBlob,
    width,
    height,
    detected: true,
    confidence: result.confidence,
    status: 'success',
    profile: result.profile,
    attemptedProfiles: result.attemptedProfiles,
  }
}
