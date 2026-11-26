import { createFrameProcessor } from '../core/frameProcessor.js'

export async function processVideo(file, options = {}) {
  const { Input, BlobSource, MP4, QTFF, MATROSKA, WEBM, Output, Mp4OutputFormat, BufferTarget, Conversion } = await import('mediabunny')
  const input = new Input({ source: new BlobSource(file), formats: [MP4, QTFF, WEBM, MATROSKA] })
  try {
    if (!await input.getPrimaryVideoTrack()) throw new Error('No video track found.')
    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
    let processor, ctx, skippedFrames = 0, processedFrames = 0, reason
    const conversion = await Conversion.init({
      input, output,
      video: {
        codec: 'avc', bitrate: options.bitrate || 5_000_000,
        process(sample) {
          if (!ctx) {
            const { displayWidth: w, displayHeight: h } = sample
            ctx = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true })
            processor = createFrameProcessor(w, h, options)
          }
          sample.draw(ctx, 0, 0)
          const pixels = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
          const frame = processor.process(pixels)
          if (frame.processed) {
            ctx.putImageData(pixels, 0, 0)
            processedFrames++
          } else {
            reason = frame.reason
            skippedFrames++
          }
          return ctx.canvas
        },
      },
    })
    if (!conversion.isValid || conversion.discardedTracks.length) {
      throw new Error('This browser cannot decode or export all tracks in this file.')
    }
    if (options.onProgress) conversion.onProgress = fraction => options.onProgress(Math.round(fraction * 100), 100)
    await conversion.execute()
    return Object.assign(new Blob([output.target.buffer], { type: 'video/mp4' }), {
      processedFrames, skippedFrames, videoProfile: processor?.profile, skipped: !processedFrames,
      reason: processedFrames ? null : reason || 'no_frames',
    })
  } finally {
    input.dispose()
  }
}
