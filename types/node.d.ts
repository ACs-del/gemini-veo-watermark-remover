export { processFrame, createFrameProcessor, getVeoWatermarkInfo, removeWatermark, detectVeoWatermarkConfig, calculateWatermarkPosition, normalizeVideoWatermarkProfile, getEmbeddedAlphaMap, registerAlphaMap, GEMINI_DIAMOND_VIDEO_CATALOG, LEGACY_VEO_TEXT_CATALOG, VIDEO_WATERMARK_PROFILES, VEO_WATERMARK_CATALOG } from './browser.js'
export declare function processVideo(input: Blob | Uint8Array, options?: Parameters<typeof processVideoFile>[2]): Promise<Uint8Array>
export declare function processVideoFile(inputPath: string, outputPath: string, options?: {
  videoProfile?: 'diamond' | 'legacy'
  region?: { x: number; y: number; width: number; height: number }
  onProgress?: (current: number, total: number) => void
}): Promise<{ inputPath: string; outputPath: string; size: number; profile: string; processedFrames: number; skippedFrames: number; skipped: boolean; reason: string | null }>
