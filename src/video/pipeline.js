/**
 * Full video processing pipeline.
 * Orchestrates: decode → per-frame watermark removal → encode.
 */

import { createDecoder } from './videoDecoder.js';
import { createEncoder } from './videoEncoder.js';
import { createFrameProcessor } from '../core/frameProcessor.js';

/**
 * @typedef {Object} ProcessOptions
 * @property {string} [environment] - 'browser' | 'node' | 'auto'
 * @property {number} [bitrate] - Output bitrate
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
  const { environment = 'auto', bitrate, onProgress } = options;

  // 1. Decode
  const decoder = createDecoder(environment);
  const videoInfo = await decoder.open(input);

  // 2. Setup frame processor
  const processor = createFrameProcessor(videoInfo.width, videoInfo.height);

  // 3. Setup encoder
  const encoder = createEncoder(environment);
  await encoder.init({
    width: videoInfo.width,
    height: videoInfo.height,
    fps: videoInfo.fps,
    bitrate: bitrate || 5_000_000,
  });

  // 4. Extract and pass through audio
  const audioData = await decoder.extractAudio();
  if (audioData) {
    await encoder.setAudioTrack(audioData);
  }

  // 5. Process frames
  let frameIndex = 0;
  const totalFrames = videoInfo.frameCount || 0;

  for await (const frame of decoder.decodeFrames()) {
    // Remove watermark from frame
    processor.process(frame.imageData);

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

  return output;
}
