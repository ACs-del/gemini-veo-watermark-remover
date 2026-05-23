/**
 * ffmpeg.wasm encoder (Node.js / fallback).
 */

import { VideoEncoderBase } from './videoEncoder.base.js';

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

  async encodeFrame(imageData) {
    const frameName = `frame_${String(this.#frameIndex).padStart(6, '0')}.raw`;
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

    const args = [
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-s',
      `${width}x${height}`,
      '-r',
      String(fps),
      '-i',
      'frame_%06d.raw',
    ];

    if (this.#audioData) {
      args.push('-i', 'audio.aac', '-c:a', 'copy');
    }

    args.push(
      '-c:v',
      'libx264',
      '-b:v',
      String(bitrate || 5_000_000),
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      'output.mp4',
    );

    await this.#ffmpeg.exec(args);
    const data = await this.#ffmpeg.readFile('output.mp4');

    for (let i = 0; i < this.#frameIndex; i++) {
      const name = `frame_${String(i).padStart(6, '0')}.raw`;
      try {
        await this.#ffmpeg.deleteFile(name);
      } catch {}
    }
    try {
      await this.#ffmpeg.deleteFile('output.mp4');
    } catch {}
    if (this.#audioData) {
      try {
        await this.#ffmpeg.deleteFile('audio.aac');
      } catch {}
    }

    return data;
  }
}
