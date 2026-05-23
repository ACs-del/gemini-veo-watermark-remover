/**
 * WebCodecs-based video decoder (browser only).
 */

import { VideoDecoderBase } from './videoDecoder.base.js';

export class WebCodecsDecoder extends VideoDecoderBase {
  #videoInfo = null;
  #file = null;
  #frameIndex = 0;

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

    decoder.configure({
      codec: this.#videoInfo.codec,
      codedWidth: width,
      codedHeight: height,
    });

    this.#file.onSamples = (_trackId, _user, samples) => {
      for (const sample of samples) {
        const chunk = new EncodedVideoChunk({
          type: sample.is_sync ? 'key' : 'delta',
          timestamp: (sample.cts * 1_000_000) / sample.timescale,
          duration: (sample.duration * 1_000_000) / sample.timescale,
          data: sample.data,
        });
        decoder.decode(chunk);
      }
    };

    this.#file.start();

    while (!done) {
      if (pendingFrames.length > 0) {
        yield pendingFrames.shift();
      } else {
        const frame = await new Promise((resolve) => {
          resolveNext = resolve;
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
