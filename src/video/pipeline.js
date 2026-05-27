/**
 * Full video processing pipeline.
 * Orchestrates: decode → per-frame watermark removal → encode.
 */

import { createDecoder, createNodeDecoder } from './videoDecoder.js';
import { createEncoder, createNodeEncoder } from './videoEncoder.js';
import { createFrameProcessor } from '../core/frameProcessor.js';

/**
 * @typedef {Object} ProcessOptions
 * @property {string} [environment] - 'browser' | 'node' | 'auto'
 * @property {number} [bitrate] - Output bitrate
 * @property {'diamond'|'legacy'} [videoProfile] - diamond for Gemini 3.5+ videos, legacy for old "Veo" text videos
 * @property {(current: number, total: number) => void} [onProgress]
 */

/**
 * Process a video file to remove Veo watermarks.
 *
 * @param {File|Blob|Uint8Array} input - Source video
 * @param {ProcessOptions} options
 * @returns {Promise<Blob|Uint8Array>} Processed video
 */
export async function processVideo(input, options = {}) {
  const { environment = 'auto', bitrate, onProgress, videoProfile = 'diamond' } = options;

  const useNode =
    environment === 'node' ||
    (environment === 'auto' && typeof VideoDecoder === 'undefined');

  const decoder = useNode ? await createNodeDecoder() : createDecoder(environment);
  const videoInfo = await decoder.open(input);

  const processor = createFrameProcessor(videoInfo.width, videoInfo.height, { videoProfile });

  const encoder = useNode ? await createNodeEncoder() : createEncoder(environment);
  await encoder.init({
    width: videoInfo.width,
    height: videoInfo.height,
    fps: videoInfo.fps,
    bitrate: bitrate || 5_000_000,
    codec: videoInfo.codec,
  });

  // 4. Extract and pass through audio
  const audioData = await decoder.extractAudio();
  if (audioData) {
    await encoder.setAudioTrack(audioData);
  }

  // 5. Process frames
  let frameIndex = 0;
  let processedFrames = 0;
  let skippedFrames = 0;
  let skipReason = null;
  const totalFrames = videoInfo.frameCount || 0;

  for await (const frame of decoder.decodeFrames()) {
    // Remove watermark from frame
    const frameResult = processor.process(frame.imageData);
    if (frameResult.processed) {
      processedFrames++;
    } else {
      skippedFrames++;
      skipReason = skipReason || frameResult.reason || 'not_processed';
    }

    // Encode processed frame
    await encoder.encodeFrame(frame.imageData, frame.timestamp);

    frameIndex++;
    if (onProgress && totalFrames > 0) {
      onProgress(frameIndex, totalFrames);
    }
  }

  // 6. Finalize
  await decoder.close();
  const output = await encoder.finalize();

  if (output && typeof output === 'object') {
    output.videoProfile = processor.profile;
    output.processedFrames = processedFrames;
    output.skippedFrames = skippedFrames;
    output.skipped = processedFrames === 0;
    output.reason = processedFrames === 0 ? skipReason : null;
  }

  return output;
}
