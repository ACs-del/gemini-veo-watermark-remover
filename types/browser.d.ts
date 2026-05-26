export interface GeminiRemovalResult {
  blob: Blob
  width: number
  height: number
  detected: boolean
  confidence: number
  status: string
  profile?: string | null
  attemptedProfiles?: string[]
}

export interface VideoProgressCallback {
  (current: number, total: number): void
}

export function removeGeminiWatermark(
  file: File | Blob,
  options?: {
    quality?: number
    format?: string
    skipDetection?: boolean
    profile?: 'auto' | 'current' | 'legacy' | 'v1' | 'v2'
  },
): Promise<GeminiRemovalResult>

export function processVideoFile(
  file: File,
  options?: {
    onProgress?: VideoProgressCallback
    videoProfile?: 'diamond' | 'legacy'
    bitrate?: number
  },
): Promise<Blob>

export function processVideo(
  input: File | Blob,
  options?: {
    onProgress?: VideoProgressCallback
    videoProfile?: 'diamond' | 'legacy'
    bitrate?: number
  },
): Promise<Blob>

export function removeWatermark(...args: unknown[]): unknown
export function processFrame(...args: unknown[]): unknown
export function createFrameProcessor(...args: unknown[]): unknown
export function getVeoWatermarkInfo(...args: unknown[]): unknown
export function detectVeoWatermarkConfig(...args: unknown[]): unknown
export function calculateWatermarkPosition(...args: unknown[]): unknown
export function normalizeVideoWatermarkProfile(...args: unknown[]): unknown
export function getEmbeddedAlphaMap(...args: unknown[]): unknown
export function registerAlphaMap(...args: unknown[]): unknown
export function processImage(...args: unknown[]): unknown
export function createImageProcessor(...args: unknown[]): unknown
export function getGeminiWatermarkInfo(...args: unknown[]): unknown
export function getGeminiAlphaMap(...args: unknown[]): unknown
export function registerGeminiAlphaMap(...args: unknown[]): unknown

export const GEMINI_DIAMOND_VIDEO_CATALOG: Record<string, unknown>
export const LEGACY_VEO_TEXT_CATALOG: Record<string, unknown>
export const VIDEO_WATERMARK_PROFILES: Record<string, unknown>
export const VEO_WATERMARK_CATALOG: Record<string, unknown>
export const GEMINI_WATERMARK_PROFILES: Record<string, unknown>

export const processImageFrame: typeof processFrame
