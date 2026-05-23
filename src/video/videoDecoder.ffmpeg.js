/**
 * ffmpeg.wasm-based video decoder (Node.js / fallback).
 */

import { VideoDecoderBase } from './videoDecoder.base.js';

export class FfmpegDecoder extends VideoDecoderBase {
  #ffmpeg = null;
  #videoInfo = null;
  #inputName = 'input.mp4';

  async open(source) {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile } = await import('@ffmpeg/util');

    this.#ffmpeg = new FFmpeg();
    await this.#ffmpeg.load();

    const data =
      source instanceof Uint8Array
        ? source
        : new Uint8Array(await fetchFile(source));
    await this.#ffmpeg.writeFile(this.#inputName, data);

    let probeOutput = '';
    this.#ffmpeg.on('log', ({ message }) => {
      probeOutput += `${message}\n`;
    });

    await this.#ffmpeg.exec(['-i', this.#inputName, '-f', 'null', '-frames:v', '0', '-']);

    const sizeMatch = probeOutput.match(/(\d{3,5})x(\d{3,5})/);
    const fpsMatch = probeOutput.match(/([\d.]+)\s*fps/);
    const durMatch = probeOutput.match(/Duration:\s*([\d:.]+)/);

    const width = sizeMatch ? Number.parseInt(sizeMatch[1], 10) : 0;
    const height = sizeMatch ? Number.parseInt(sizeMatch[2], 10) : 0;
    const fps = fpsMatch ? Number.parseFloat(fpsMatch[1]) : 30;

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

  async *decodeFrames() {
    if (!this.#ffmpeg || !this.#videoInfo) {
      throw new Error('Call open() first');
    }

    const { width, height, fps } = this.#videoInfo;
    const rawName = 'frames.raw';

    await this.#ffmpeg.exec([
      '-i',
      this.#inputName,
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      rawName,
    ]);

    const rawData = await this.#ffmpeg.readFile(rawName);
    const frameSize = width * height * 4;
    const totalFrames = Math.floor(rawData.length / frameSize);

    for (let i = 0; i < totalFrames; i++) {
      const offset = i * frameSize;
      const pixels = new Uint8ClampedArray(
        rawData.buffer,
        rawData.byteOffset + offset,
        frameSize,
      );
      const imageData = new ImageData(pixels, width, height);

      yield {
        imageData,
        timestamp: (i / fps) * 1_000_000,
        frameIndex: i,
      };
    }

    await this.#ffmpeg.deleteFile(rawName);
  }

  async extractAudio() {
    if (!this.#ffmpeg) return null;

    try {
      const audioName = 'audio.aac';
      await this.#ffmpeg.exec(['-i', this.#inputName, '-vn', '-acodec', 'copy', audioName]);
      const audioData = await this.#ffmpeg.readFile(audioName);
      await this.#ffmpeg.deleteFile(audioName);
      return audioData;
    } catch {
      return null;
    }
  }

  async close() {
    if (this.#ffmpeg) {
      try {
        await this.#ffmpeg.deleteFile(this.#inputName);
      } catch {}
      this.#ffmpeg = null;
    }
    this.#videoInfo = null;
  }
}
