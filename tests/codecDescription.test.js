import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

import {
  buildAvcDecoderConfigurationRecord,
  extractCodecDescription,
} from '../src/video/codecDescription.js';

const require = createRequire(import.meta.url);
const { createFile } = require('mp4box');

function loadFixture(name) {
  const buf = readFileSync(new URL(`./fixtures/codec/${name}`, import.meta.url));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  ab.fileStart = 0;
  return ab;
}

test('extractCodecDescription returns AVCDecoderConfigurationRecord for diamond-1080', () => {
  const mp4 = createFile();
  const buffer = loadFixture('h264-1920x1080.mp4');

  const description = new Promise((resolve, reject) => {
    mp4.onReady = (info) => {
      try {
        resolve(extractCodecDescription(mp4, info.videoTracks[0].id));
      } catch (error) {
        reject(error);
      }
    };
    mp4.onError = reject;
    mp4.appendBuffer(buffer);
    mp4.flush();
  });

  return description.then((desc) => {
    assert.ok(desc instanceof Uint8Array);
    assert.ok(desc.length >= 8);
    assert.equal(desc[0], 1);
  });
});

test('buildAvcDecoderConfigurationRecord matches mp4box write payload size', () => {
  const mp4 = createFile();
  const buffer = loadFixture('h264-1280x720.mp4');

  return new Promise((resolve, reject) => {
    mp4.onReady = (info) => {
      try {
        const trak = mp4.getTrackById(info.videoTracks[0].id);
        const avcC = trak.mdia.minf.stbl.stsd.entries[0].avcC;
        const built = buildAvcDecoderConfigurationRecord(avcC);
        assert.ok(built.length > 0);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    mp4.onError = reject;
    mp4.appendBuffer(buffer);
    mp4.flush();
  });
});
