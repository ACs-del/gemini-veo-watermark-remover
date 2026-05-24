import assert from 'node:assert/strict';
import test from 'node:test';

import { createFrameProcessor, processFrame } from '../src/core/frameProcessor.js';
import { getVeoWatermarkInfo } from '../src/core/veoConfig.js';

function createImageData(width, height) {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4).fill(128),
  };
}

test('default video profile is Gemini 3.5 diamond landscape', () => {
  const info = getVeoWatermarkInfo(1920, 1080);

  assert.equal(info.profile, 'diamond');
  assert.deepEqual(info.position, { x: 1632, y: 792, width: 96, height: 96 });

  const processor = createFrameProcessor(1920, 1080);
  assert.equal(processor.profile, 'diamond');
  assert.deepEqual(processor.position, { x: 1632, y: 792, width: 96, height: 96 });
});

test('default video profile is Gemini 3.5 diamond portrait', () => {
  const processor = createFrameProcessor(1080, 1920);

  assert.equal(processor.profile, 'diamond');
  assert.deepEqual(processor.position, { x: 792, y: 1632, width: 96, height: 96 });
});

test('diamond profile rejects uncalibrated 720p video', () => {
  const processor = createFrameProcessor(1280, 720, { videoProfile: 'diamond' });
  const result = processor.process(createImageData(1280, 720));

  assert.equal(processor.profile, 'diamond');
  assert.equal(processor.position, null);
  assert.equal(result.processed, false);
  assert.equal(result.reason, 'unsupported_resolution');
  assert.equal(result.profile, 'diamond');
});

test('legacy profile keeps old Veo text 720p support', () => {
  const processor = createFrameProcessor(1280, 720, { videoProfile: 'legacy' });

  assert.equal(processor.profile, 'legacy');
  assert.deepEqual(processor.position, { x: 1180, y: 684, width: 80, height: 28 });
});

test('processFrame returns stable reasons for bad profile and unsupported resolution', () => {
  const unknown = processFrame(createImageData(1920, 1080), { videoProfile: 'nonsense' });
  assert.equal(unknown.processed, false);
  assert.equal(unknown.reason, 'unsupported_profile');
  assert.equal(unknown.profile, null);

  const unsupported = processFrame(createImageData(1280, 720));
  assert.equal(unsupported.processed, false);
  assert.equal(unsupported.reason, 'unsupported_resolution');
  assert.equal(unsupported.profile, 'diamond');
});
