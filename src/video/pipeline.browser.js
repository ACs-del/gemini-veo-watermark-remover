/**
 * Browser-only video pipeline (WebCodecs — no ffmpeg.wasm).
 */

import { WebCodecsDecoder } from './videoDecoder.webcodecs.js';
import { WebCodecsEncoder } from './videoEncoder.webcodecs.js';
import { createFrameProcessor } from '../core/frameProcessor.js';

/**
 * @typedef {Object} ProcessOptions
 * @property {(current: number, total: number) => void} [onProgress]
 * @property {number} [bitrate]
 */

/**
 * Process a video file to remove Veo watermarks in the browser.
 *
 * @param {File|Blob} input
 * @param {ProcessOptions} options
 * @returns {Promise<Blob>}
 */
export async function processVideo(input, options = {}) {
  const { bitrate, onProgress } = options;

  const decoder = new WebCodecsDecoder();
  const videoInfo = await decoder.open(input);

  const processor = createFrameProcessor(videoInfo.width, videoInfo.height);

  const encoder = new WebCodecsEncoder();
  await encoder.init({
    width: videoInfo.width,
    height: videoInfo.height,
    fps: videoInfo.fps,
    bitrate: bitrate || 5_000_000,
  });

  const audioData = await decoder.extractAudio();
  if (audioData) {
    await encoder.setAudioTrack(audioData);
  }

  let frameIndex = 0;
  const totalFrames = videoInfo.frameCount || 0;

  for await (const frame of decoder.decodeFrames()) {
    processor.process(frame.imageData);
    await encoder.encodeFrame(frame.imageData, frame.timestamp);

    frameIndex++;
    if (onProgress && totalFrames > 0) {
      onProgress(frameIndex, totalFrames);
    }
  }

  await decoder.close();
  return encoder.finalize();
}
