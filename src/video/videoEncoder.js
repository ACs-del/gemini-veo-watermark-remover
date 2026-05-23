/**
 * Video encoder factory.
 */

import { WebCodecsEncoder } from './videoEncoder.webcodecs.js';

export { VideoEncoderBase } from './videoEncoder.base.js';
export { WebCodecsEncoder } from './videoEncoder.webcodecs.js';

export function createEncoder(environment = 'auto') {
  if (
    environment === 'browser' ||
    (environment === 'auto' && typeof VideoEncoder !== 'undefined')
  ) {
    return new WebCodecsEncoder();
  }

  throw new Error(
    'Node.js encoding requires createNodeEncoder() from videoEncoder.ffmpeg.js',
  );
}

export async function createNodeEncoder() {
  const { FfmpegEncoder } = await import('./videoEncoder.ffmpeg.js');
  return new FfmpegEncoder();
}
