/**
 * Video encoder abstraction layer.
 * Encodes processed frames back into MP4 using:
 * - WebCodecs VideoEncoder + mp4-muxer (browser)
 * - ffmpeg.wasm (Node.js / fallback)
 */

/**
 * @typedef {Object} EncoderConfig
 * @property {number} width
 * @property {number} height
 * @property {number} fps
 * @property {number} [bitrate] - Target bitrate in bps
 * @property {string} [codec] - e.g. 'avc1.42001f'
 */

/**
 * Abstract video encoder.
 */
export class VideoEncoderBase {
  async init(config) { throw new Error('Not implemented'); }
  async encodeFrame(imageData, timestamp) { throw new Error('Not implemented'); }
  async setAudioTrack(audioData) { throw new Error('Not implemented'); }
  async finalize() { throw new Error('Not implemented'); }
}

/**
 * WebCodecs + mp4-muxer encoder (browser).
 */
export class WebCodecsEncoder extends VideoEncoderBase {
  #muxer = null;
  #encoder = null;
  #config = null;
  #frameCount = 0;

  async init(config) {
    if (typeof VideoEncoder === 'undefined') {
      throw new Error('WebCodecs API not available');
    }

    const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');

    this.#config = config;
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
    // TODO: Add audio muxing support via mp4-muxer audio track
  }

  async finalize() {
    await this.#encoder.flush();
    this.#encoder.close();
    this.#muxer.finalize();
    return new Blob([this._target.buffer], { type: 'video/mp4' });
  }
}

/**
 * ffmpeg.wasm encoder (Node.js / fallback).
 */
export class FfmpegEncoder extends VideoEncoderBase {
  #ffmpeg = null;
  #config = null;
  #frameIndex = 0;
  #audioData = null;

  async init(config) {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    this.#ffmpeg = new FFmpeg();
    await this.#ffmpeg.load();
    this.#config = config;
    this.#frameIndex = 0;
  }

  async encodeFrame(imageData, timestamp) {
    const { width, height } = imageData;
    const frameName = `frame_${String(this.#frameIndex).padStart(6, '0')}.raw`;

    // Write raw RGBA frame
    await this.#ffmpeg.writeFile(frameName, new Uint8Array(imageData.data.buffer));
    this.#frameIndex++;
  }

  async setAudioTrack(audioData) {
    if (audioData) {
      await this.#ffmpeg.writeFile('audio.aac', audioData);
      this.#audioData = true;
    }
  }

  async finalize() {
    const { width, height, fps, bitrate } = this.#config;

    // Build frame list pattern
    const args = [
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${width}x${height}`,
      '-r', String(fps),
      '-i', 'frame_%06d.raw',
    ];

    if (this.#audioData) {
      args.push('-i', 'audio.aac', '-c:a', 'copy');
    }

    args.push(
      '-c:v', 'libx264',
      '-b:v', String(bitrate || 5_000_000),
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      'output.mp4'
    );

    await this.#ffmpeg.exec(args);
    const data = await this.#ffmpeg.readFile('output.mp4');

    // Cleanup
    for (let i = 0; i < this.#frameIndex; i++) {
      const name = `frame_${String(i).padStart(6, '0')}.raw`;
      try { await this.#ffmpeg.deleteFile(name); } catch {}
    }
    try { await this.#ffmpeg.deleteFile('output.mp4'); } catch {}
    if (this.#audioData) {
      try { await this.#ffmpeg.deleteFile('audio.aac'); } catch {}
    }

    return data; // Uint8Array
  }
}

/**
 * Auto-select the best available encoder.
 */
export function createEncoder(environment = 'auto') {
  if (environment === 'browser' || (environment === 'auto' && typeof VideoEncoder !== 'undefined')) {
    return new WebCodecsEncoder();
  }
  return new FfmpegEncoder();
}
