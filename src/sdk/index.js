/**
 * Main SDK entry point.
 * Re-exports all public APIs for both browser and Node.js usage.
 */

export { removeWatermark, applySyntheticWatermark } from '../core/blendModes.js';
export { processFrame, createFrameProcessor } from '../core/frameProcessor.js';
export { detectVeoWatermarkConfig, calculateWatermarkPosition, getVeoWatermarkInfo } from '../core/veoConfig.js';
export { getEmbeddedAlphaMap, registerAlphaMap, listAlphaMapKeys } from '../core/embeddedAlphaMaps.js';
export { processVideo } from '../video/pipeline.js';
export { createDecoder } from '../video/videoDecoder.js';
export { createEncoder } from '../video/videoEncoder.js';
