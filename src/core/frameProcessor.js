import { removeWatermark } from './blendModes.js'
import { getEmbeddedAlphaMap, resizeAlphaMap } from './embeddedAlphaMaps.js'
import { computeNCC } from './gemini/imageProcessor.js'
import { getVeoWatermarkInfo, normalizeVideoWatermarkProfile } from './veoConfig.js'

function candidate(map, position) {
  const { width, height } = position
  return { position, alpha: resizeAlphaMap(map.data, map.width, map.height, width, height) }
}

function candidates(width, height, profile, region) {
  const info = getVeoWatermarkInfo(width, height, profile)
  const fallbackKey = profile === 'legacy' ? '720p-landscape' : 'veo-diamond-1080p-landscape'
  const map = getEmbeddedAlphaMap(info?.alphaMapKey || fallbackKey)
  if (region) {
    const { x, y, width: w, height: h } = region
    if (![x, y, w, h].every(Number.isSafeInteger) || Math.min(x, y) < 0 || Math.min(w, h) <= 0 ||
        x + w > width || y + h > height) throw new RangeError('Video region must fit inside the frame')
    return [candidate(map, region)]
  }
  const variants = info ? [candidate(map, info.position)] : []
  const short = Math.min(width, height)
  if (profile === 'diamond' && [720, 1080].includes(short)) {
    const scale = short / 720
    // Standard, compact, and half-scale stamped exports have distinct margins.
    for (const [size, right, bottom] of [[48,72,72], [44,29,40], [22,37,42]]) {
      const w = Math.round(size * scale)
      variants.push(candidate(map, { x: width - w - Math.round(right * scale),
        y: height - w - Math.round(bottom * scale), width: w, height: w }))
    }
  }
  if ([720, 1080].includes(short)) {
    const text = getEmbeddedAlphaMap(short === 720 ? '720p-landscape' : '1080p-landscape')
    const scale = short / 720
    for (const [w, h, right, bottom] of [[45, 20, 16, 17], [68, 30, 16, 16]]) {
      const pw = Math.round(w * scale), ph = Math.round(h * scale)
      variants.push(candidate(text, { x: width - pw - Math.round(right * scale),
        y: height - ph - Math.round(bottom * scale), width: pw, height: ph }))
    }
  }
  return variants
}

function score(frame, item, x, y) {
  const { width, height } = item.position
  return computeNCC(frame.data, frame.width, x, y, item.alpha, width, height, 2)
}

export function createFrameProcessor(width, height, options = {}) {
  const profile = normalizeVideoWatermarkProfile(options.videoProfile ?? options.profile)
  const variants = profile ? candidates(width, height, profile, options.region) : []
  let locked = null
  return {
    profile,
    position: variants[0]?.position ?? null,
    process(frame) {
      const skipped = reason => ({ imageData: frame, processed: false, profile, reason })
      if (!variants.length) return skipped(profile ? 'unsupported_resolution' : 'unsupported_profile')
      let best = locked
      let confidence = best ? score(frame, best, best.position.x, best.position.y) : 0
      if (!best) {
        const radius = options.region ? 0 : 4
        for (const item of variants) {
          const p = item.position
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const x = p.x + dx, y = p.y + dy
              if (x < 0 || y < 0 || x + p.width > width || y + p.height > height) continue
              const ncc = score(frame, item, x, y)
              if (ncc > confidence) {
                confidence = ncc
                best = { alpha: item.alpha, position: { ...p, x, y } }
              }
            }
          }
        }
      }
      // Lock only after a reliable match. Re-evaluate visible presence on each frame.
      if (!best || confidence < (locked ? 0.16 : 0.35)) return skipped('watermark_not_detected')
      locked = best
      removeWatermark(frame, best.alpha, best.position)
      return { imageData: frame, processed: true, profile, position: best.position }
    },
  }
}

export function processFrame(frame, options = {}) {
  return createFrameProcessor(options.width || frame.width, options.height || frame.height, options).process(frame)
}
