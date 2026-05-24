/**
 * Main SDK entry point.
 * Re-exports all public APIs for both browser and Node.js usage.
 */

// Core blend algorithm (shared between Veo and Gemini)
export { removeWatermark, applySyntheticWatermark } from '../core/blendModes.js'

// Veo video watermark processing
export { processFrame, createFrameProcessor } from '../core/frameProcessor.js'
export {
  detectVeoWatermarkConfig,
  calculateWatermarkPosition,
  getVeoWatermarkInfo,
  normalizeVideoWatermarkProfile,
  GEMINI_DIAMOND_VIDEO_CATALOG,
  LEGACY_VEO_TEXT_CATALOG,
  VIDEO_WATERMARK_PROFILES,
  VEO_WATERMARK_CATALOG,
} from '../core/veoConfig.js'
export { getEmbeddedAlphaMap, registerAlphaMap, listAlphaMapKeys } from '../core/embeddedAlphaMaps.js'
export { processVideo } from '../video/pipeline.js'
export { createDecoder } from '../video/videoDecoder.js'
export { createEncoder } from '../video/videoEncoder.js'

// Gemini image watermark processing
export { processImage, createImageProcessor } from '../core/gemini/imageProcessor.js'
export {
  getGeminiWatermarkInfo,
  detectGeminiWatermarkConfig,
  calculateGeminiWatermarkPosition,
  GEMINI_WATERMARK_PROFILES,
} from '../core/gemini/geminiConfig.js'
export { getGeminiAlphaMap, registerGeminiAlphaMap, loadAndRegisterAlphaMap, listGeminiAlphaMapKeys } from '../core/gemini/geminiAlphaMaps.js'
