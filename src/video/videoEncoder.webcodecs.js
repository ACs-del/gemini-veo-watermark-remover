/**
 * WebCodecs + mp4-muxer encoder (browser).
 */

import { VideoEncoderBase } from './videoEncoder.base.js';

export class WebCodecsEncoder extends VideoEncoderBase {
  #muxer = null;
  #encoder = null;
  #frameCount = 0;
  _target = null;

  async init(config) {
    if (typeof VideoEncoder === 'undefined') {
      throw new Error('WebCodecs API not available');
    }

    const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');

    const target = new ArrayBufferTarget();

    this.#muxer = new Muxer({
      target,
      video: {
        codec: 'avc',
        width: config.width,
        height: config.height,
      },
      fastStart: 'in-memory',
    });

    this.#encoder = new VideoEncoder({
      output: (chunk, meta) => {
        this.#muxer.addVideoChunk(chunk, meta);
      },
      error: (e) => {
        console.error('Encoder error:', e);
      },
    });

    this.#encoder.configure({
      codec: config.codec || 'avc1.42001f',
      width: config.width,
      height: config.height,
      bitrate: config.bitrate || 5_000_000,
      framerate: config.fps,
    });

    this._target = target;
  }

  async encodeFrame(imageData, timestamp) {
    const frame = new VideoFrame(imageData.data.buffer, {
      format: 'RGBA',
      codedWidth: imageData.width,
      codedHeight: imageData.height,
      timestamp,
    });

    const isKey = this.#frameCount % 30 === 0;
    this.#encoder.encode(frame, { keyFrame: isKey });
    frame.close();
    this.#frameCount++;
  }

  async setAudioTrack(/* audioData */) {
    // TODO: mux audio via mp4-muxer
  }

  async finalize() {
    await this.#encoder.flush();
    this.#encoder.close();
    this.#muxer.finalize();
    return new Blob([this._target.buffer], { type: 'video/mp4' });
  }
}
