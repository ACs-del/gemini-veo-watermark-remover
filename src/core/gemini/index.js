/**
 * Gemini image watermark removal module.
 * Re-exports all public APIs for the Gemini engine.
 */

// Configuration & detection
export {
  detectGeminiWatermarkConfig,
  calculateGeminiWatermarkPosition,
  getGeminiWatermarkInfo,
  GEMINI_WATERMARK_SIZES,
  LARGE_IMAGE_THRESHOLD,
} from './geminiConfig.js'

// Alpha map management
export {
  getGeminiAlphaMap,
  registerGeminiAlphaMap,
  loadAndRegisterAlphaMap,
  listGeminiAlphaMapKeys,
  decodeAlphaMapFromBase64,
  loadAlphaMapFromPNG,
} from './geminiAlphaMaps.js'

// Image processing
export {
  processImage,
  createImageProcessor,
  findWatermarkPosition,
} from './imageProcessor.js'
