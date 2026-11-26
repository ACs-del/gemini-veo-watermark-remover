import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { processNative } from './native.js'

export async function processVideo(input, options = {}) {
  if (options.environment === 'browser' || (options.environment !== 'node' && typeof VideoDecoder !== 'undefined')) {
    const browser = await import('./pipeline.browser.js')
    return browser.processVideo(input, options)
  }
  const tmp = await mkdtemp(join(tmpdir(), 'pictx-video-'))
  try {
    const src = join(tmp, 'input'), dst = join(tmp, 'output.mp4')
    await writeFile(src, input instanceof Blob ? new Uint8Array(await input.arrayBuffer()) : input)
    const { profile, processedFrames, skippedFrames, skipped, reason } = await processNative(src, dst, options)
    return Object.assign(new Uint8Array(await readFile(dst)), { videoProfile: profile, processedFrames, skippedFrames, skipped, reason })
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}
