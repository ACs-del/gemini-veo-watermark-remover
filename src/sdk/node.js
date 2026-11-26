export { removeWatermark } from '../core/blendModes.js';
export { processFrame, createFrameProcessor } from '../core/frameProcessor.js';
export {
  getVeoWatermarkInfo,
  detectVeoWatermarkConfig,
  calculateWatermarkPosition,
  normalizeVideoWatermarkProfile,
  GEMINI_DIAMOND_VIDEO_CATALOG,
  LEGACY_VEO_TEXT_CATALOG,
  VIDEO_WATERMARK_PROFILES,
  VEO_WATERMARK_CATALOG,
} from '../core/veoConfig.js';
export { getEmbeddedAlphaMap, registerAlphaMap } from '../core/embeddedAlphaMaps.js';
export { processVideo } from '../video/pipeline.js';

export { processNative as processVideoFile } from '../video/native.js'
