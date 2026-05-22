/**
 * Video decoder abstraction layer.
 * Provides a unified interface for decoding video frames from:
 * - WebCodecs API (browser, Chrome 94+)
 * - ffmpeg.wasm (Node.js / fallback)
 */

/**
 * @typedef {Object} VideoInfo
 * @property {number} width
 * @property {number} height
 * @property {number} frameCount - Total frames (0 if unknown)
 * @property {number} duration - Duration in seconds
 * @property {number} fps - Frames per second
 * @property {string} codec - e.g. 'avc1', 'vp9'
 */

/**
 * @typedef {Object} DecodedFrame
 * @property {ImageData} imageData
 * @property {number} timestamp - Presentation timestamp in microseconds
 * @property {number} frameIndex
 */

/**
 * Abstract video decoder interface.
 */
export class VideoDecoderBase {
  /** @returns {Promise<VideoInfo>} */
  async open(/* source */) { throw new Error('Not implemented'); }

  /** @returns {AsyncGenerator<DecodedFrame>} */
  async *decodeFrames() { throw new Error('Not implemented'); }

  /** @returns {Promise<Uint8Array|null>} Raw audio track data */
  async extractAudio() { return null; }

  async close() {}
}

/**
 * WebCodecs-based video decoder (browser only).
 * Uses VideoDecoder + MP4Box.js for demuxing.
 */
export class WebCodecsDecoder extends VideoDecoderBase {
  #videoInfo = null;
  #file = null;
  #frames = [];
  #resolveFrames = null;
  #frameIndex = 0;

  /**
   * @param {File|Blob} source - Video file
   * @returns {Promise<VideoInfo>}
   */
  async open(source) {
    if (typeof VideoDecoder === 'undefined') {
      throw new Error('WebCodecs API not available. Use Chrome 94+ or a fallback decoder.');
    }

    const buffer = await source.arrayBuffer();
    const { createFile } = await import('mp4box');
    const mp4File = createFile();

    return new Promise((resolve, reject) => {
      mp4File.onReady = (info) => {
        const videoTrack = info.videoTracks[0];
        if (!videoTrack) {
          reject(new Error('No video track found'));
          return;
        }

        this.#videoInfo = {
          width: videoTrack.video.width,
          height: videoTrack.video.height,
          frameCount: videoTrack.nb_samples,
          duration: videoTrack.duration / videoTrack.timescale,
          fps: videoTrack.nb_samples / (videoTrack.duration / videoTrack.timescale),
          codec: videoTrack.codec,
        };

        this.#file = mp4File;
        mp4File.setExtractionOptions(videoTrack.id);
        resolve(this.#videoInfo);
      };

      mp4File.onError = reject;

      buffer.fileStart = 0;
      mp4File.appendBuffer(buffer);
      mp4File.flush();
    });
  }

  /**
   * Decode all frames as an async generator.
   * @yields {DecodedFrame}
   */
  async *decodeFrames() {
    if (!this.#file || !this.#videoInfo) {
      throw new Error('Call open() first');
    }

    const { width, height } = this.#videoInfo;
    const pendingFrames = [];
    let resolveNext = null;
    let done = false;

    const decoder = new VideoDecoder({
      output: (frame) => {
        // Convert VideoFrame to ImageData
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(frame, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);

        const decoded = {
          imageData,
          timestamp: frame.timestamp,
          frameIndex: this.#frameIndex++,
        };

        frame.close();

        if (resolveNext) {
          const r = resolveNext;
          resolveNext = null;
          r(decoded);
        } else {
          pendingFrames.push(decoded);
        }
      },
      error: (e) => {
        console.error('Decoder error:', e);
        done = true;
      },
    });

    // Configure decoder
    decoder.configure({
      codec: this.#videoInfo.codec,
      codedWidth: width,
      codedHeight: height,
    });

    // Feed samples from MP4Box
    this.#file.onSamples = (trackId, user, samples) => {
      for (const sample of samples) {
        const chunk = new EncodedVideoChunk({
          type: sample.is_sync ? 'key' : 'delta',
          timestamp: sample.cts * 1_000_000 / sample.timescale,
          duration: sample.duration * 1_000_000 / sample.timescale,
          data: sample.data,
        });
        decoder.decode(chunk);
      }
    };

    this.#file.start();

    // Yield frames as they come
    while (!done) {
      if (pendingFrames.length > 0) {
        yield pendingFrames.shift();
      } else {
        // Wait for next frame or completion
        const frame = await new Promise((resolve) => {
          resolveNext = resolve;
          // Check if decoder is done
          if (decoder.decodeQueueSize === 0) {
            decoder.flush().then(() => {
              done = true;
              resolve(null);
            });
          }
        });
        if (frame) yield frame;
        else break;
      }
    }

    decoder.close();
  }

  async close() {
    this.#file = null;
    this.#videoInfo = null;
    this.#frameIndex = 0;
  }
}

/**
 * ffmpeg.wasm-based video decoder (Node.js / fallback).
 */
export class FfmpegDecoder extends VideoDecoderBase {
  #ffmpeg = null;
  #videoInfo = null;
  #inputName = 'input.mp4';

  /**
   * @param {Uint8Array|Buffer} source - Video file bytes
   * @returns {Promise<VideoInfo>}
   */
  async open(source) {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile } = await import('@ffmpeg/util');

    this.#ffmpeg = new FFmpeg();
    await this.#ffmpeg.load();

    const data = source instanceof Uint8Array ? source : new Uint8Array(await fetchFile(source));
    await this.#ffmpeg.writeFile(this.#inputName, data);

    // Probe video info
    let probeOutput = '';
    this.#ffmpeg.on('log', ({ message }) => { probeOutput += message + '\n'; });

    await this.#ffmpeg.exec(['-i', this.#inputName, '-f', 'null', '-frames:v', '0', '-']);

    // Parse info from ffmpeg output
    const sizeMatch = probeOutput.match(/(\d{3,5})x(\d{3,5})/);
    const fpsMatch = probeOutput.match(/([\d.]+)\s*fps/);
    const durMatch = probeOutput.match(/Duration:\s*([\d:.]+)/);

    const width = sizeMatch ? parseInt(sizeMatch[1]) : 0;
    const height = sizeMatch ? parseInt(sizeMatch[2]) : 0;
    const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 30;

    let duration = 0;
    if (durMatch) {
      const parts = durMatch[1].split(':').map(Number);
      duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    this.#videoInfo = {
      width,
      height,
      frameCount: Math.round(duration * fps),
      duration,
      fps,
      codec: 'unknown',
    };

    return this.#videoInfo;
  }

  /**
   * Decode frames by extracting raw RGBA via ffmpeg.
   * @yields {DecodedFrame}
   */
  async *decodeFrames() {
    if (!this.#ffmpeg || !this.#videoInfo) {
      throw new Error('Call open() first');
    }

    const { width, height, fps } = this.#videoInfo;
    const rawName = 'frames.raw';

    // Extract raw RGBA frames
    await this.#ffmpeg.exec([
      '-i', this.#inputName,
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      rawName,
    ]);

    const rawData = await this.#ffmpeg.readFile(rawName);
    const frameSize = width * height * 4;
    const totalFrames = Math.floor(rawData.length / frameSize);

    for (let i = 0; i < totalFrames; i++) {
      const offset = i * frameSize;
      const pixels = new Uint8ClampedArray(rawData.buffer, rawData.byteOffset + offset, frameSize);
      const imageData = new ImageData(pixels, width, height);

      yield {
        imageData,
        timestamp: (i / fps) * 1_000_000,
        frameIndex: i,
      };
    }

    await this.#ffmpeg.deleteFile(rawName);
  }

  /**
   * Extract audio track as raw data.
   */
  async extractAudio() {
    if (!this.#ffmpeg) return null;

    try {
      const audioName = 'audio.aac';
      await this.#ffmpeg.exec([
        '-i', this.#inputName,
        '-vn', '-acodec', 'copy',
        audioName,
      ]);
      const audioData = await this.#ffmpeg.readFile(audioName);
      await this.#ffmpeg.deleteFile(audioName);
      return audioData;
    } catch {
      return null; // No audio track
    }
  }

  async close() {
    if (this.#ffmpeg) {
      try { await this.#ffmpeg.deleteFile(this.#inputName); } catch {}
      this.#ffmpeg = null;
    }
    this.#videoInfo = null;
  }
}

/**
 * Auto-select the best available decoder.
 */
export function createDecoder(environment = 'auto') {
  if (environment === 'browser' || (environment === 'auto' && typeof VideoDecoder !== 'undefined')) {
    return new WebCodecsDecoder();
  }
  return new FfmpegDecoder();
}
