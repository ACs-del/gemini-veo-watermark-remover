/**
 * Video decoder factory — selects WebCodecs or ffmpeg based on environment.
 */

import { WebCodecsDecoder } from './videoDecoder.webcodecs.js';

export { VideoDecoderBase } from './videoDecoder.base.js';
export { WebCodecsDecoder } from './videoDecoder.webcodecs.js';

/**
 * @param {'browser' | 'node' | 'auto'} [environment]
 */
export function createDecoder(environment = 'auto') {
  if (
    environment === 'browser' ||
    (environment === 'auto' && typeof VideoDecoder !== 'undefined')
  ) {
    return new WebCodecsDecoder();
  }

  throw new Error(
    'Node.js decoding requires createNodeDecoder() from videoDecoder.ffmpeg.js',
  );
}

/** Lazy-load ffmpeg decoder for Node.js CLI usage. */
export async function createNodeDecoder() {
  const { FfmpegDecoder } = await import('./videoDecoder.ffmpeg.js');
  return new FfmpegDecoder();
}
