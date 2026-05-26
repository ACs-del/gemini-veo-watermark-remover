import assert from 'node:assert/strict'
import test from 'node:test'

import { applySyntheticWatermark } from '../src/core/blendModes.js'
import { getGeminiAlphaMap } from '../src/core/gemini/geminiAlphaMaps.js'
import { getGeminiWatermarkInfo } from '../src/core/gemini/geminiConfig.js'
import { computeNCC, processImage } from '../src/core/gemini/imageProcessor.js'
import { validateRestoration } from '../src/core/gemini/restorationMetrics.js'

function createSolidImage(width, height, color = 120) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color
    data[i + 1] = color - 10
    data[i + 2] = color + 5
    data[i + 3] = 255
  }
  return { width, height, data }
}

function cloneImage(imageData) {
  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8ClampedArray(imageData.data),
  }
}

function applyGeminiWatermark(imageData, profile = 'current') {
  const info = getGeminiWatermarkInfo(imageData.width, imageData.height, profile)
  assert.ok(info, 'expected watermark info for test dimensions')

  const alphaMapEntry = getGeminiAlphaMap(info.alphaMapKey)
  assert.ok(alphaMapEntry, 'expected alpha map for test profile')

  const watermarked = cloneImage(imageData)
  applySyntheticWatermark(watermarked, alphaMapEntry.data, {
    x: info.position.x,
    y: info.position.y,
    width: alphaMapEntry.width,
    height: alphaMapEntry.height,
  })

  return { watermarked, info, alphaMapEntry }
}

test('processImage removes synthetic current-profile watermark with validation', () => {
  const base = createSolidImage(1400, 1400, 140)
  const { watermarked } = applyGeminiWatermark(base, 'current')

  const result = processImage(watermarked, { profile: 'current', adaptiveMode: 'auto' })

  assert.equal(result.processed, true)
  assert.equal(result.decisionTier, 'validated')
  assert.ok(result.confidence >= 0.5)
})

test('processImage rejects plain image without watermark (restoration validation)', () => {
  const plain = createSolidImage(1400, 1400, 130)

  const result = processImage(plain, { profile: 'auto', adaptiveMode: 'auto' })

  assert.equal(result.processed, false)
  assert.equal(result.reason, 'watermark_not_detected')
})

test('adaptiveMode off skips validation tier but still requires NCC match', () => {
  const base = createSolidImage(1400, 1400, 140)
  const { watermarked } = applyGeminiWatermark(base, 'legacy')

  const result = processImage(watermarked, { profile: 'legacy', adaptiveMode: 'off' })

  assert.equal(result.processed, true)
  assert.equal(result.decisionTier, 'ncc_only')
})

test('validateRestoration rejects when halo is absent on original', () => {
  const plain = createSolidImage(1400, 1400, 130)
  const info = getGeminiWatermarkInfo(plain.width, plain.height, 'current')
  const alphaMapEntry = getGeminiAlphaMap(info.alphaMapKey)
  const position = {
    x: info.position.x,
    y: info.position.y,
    width: alphaMapEntry.width,
    height: alphaMapEntry.height,
  }

  const restored = cloneImage(plain)
  const preNcc = computeNCC(
    plain.data,
    plain.width,
    position.x,
    position.y,
    alphaMapEntry.data,
    alphaMapEntry.width,
    alphaMapEntry.height,
    2,
  )

  const validation = validateRestoration(plain, restored, position, alphaMapEntry.data, preNcc)
  assert.equal(validation.valid, false)
  assert.equal(validation.decisionTier, 'rejected')
})

test('legacy profile processes synthetic legacy watermark', () => {
  const base = createSolidImage(800, 800, 100)
  const { watermarked } = applyGeminiWatermark(base, 'legacy')

  const result = processImage(watermarked, { profile: 'legacy', adaptiveMode: 'auto' })

  assert.equal(result.processed, true)
  assert.equal(result.profile, 'legacy')
})
