/**
 * CLI implementation for gemini-veo-watermark-remover.
 * Supports both video (Veo) and image (Gemini) watermark removal.
 *
 * Usage:
 *   vwr remove <input> [options]
 *
 * Detects file type by extension and routes to the appropriate processor.
 */

import { parseArgs } from 'node:util'
import { resolve, basename, extname } from 'node:path'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { processVideoFile } from '../sdk/node.js'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv'])

const HELP = `
vwr — Gemini/Veo Watermark Remover CLI

Usage:
  vwr remove <input> [options]

Commands:
  remove    Remove watermark from a video or image file

Options:
  --output, -o     Output file path (default: <input>_clean.<ext>)
  --overwrite      Overwrite output if it exists
  --format, -f     Output format for images (png, jpeg, webp) [default: same as input]
  --quality, -q    Output quality for lossy formats (0-100) [default: 95]
  --skip-detect    Skip NCC detection, use expected position directly
  --json           Output result as JSON
  --verbose        Show detailed progress
  --help, -h       Show this help

Supported formats:
  Images: PNG, JPEG, WebP, BMP, TIFF (Gemini watermark)
  Videos: MP4, WebM, MOV, AVI, MKV (Veo watermark)

Examples:
  vwr remove image.png
  vwr remove image.jpg -o clean.png --format png
  vwr remove video.mp4
  vwr remove video.mp4 -o clean.mp4 --verbose
`

/**
 * Determine if a file is an image based on extension.
 * @param {string} filePath
 * @returns {'image'|'video'|'unknown'}
 */
function detectFileType(filePath) {
  const ext = extname(filePath).toLowerCase()
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  return 'unknown'
}

/**
 * Get the appropriate output extension for images.
 * @param {string} inputExt
 * @param {string|undefined} formatOverride
 * @returns {string}
 */
function getOutputExtension(inputExt, formatOverride) {
  if (formatOverride) {
    const map = { png: '.png', jpeg: '.jpg', jpg: '.jpg', webp: '.webp' }
    return map[formatOverride.toLowerCase()] || inputExt
  }
  return inputExt
}

/**
 * Process an image file using the Gemini engine.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {{ skipDetection?: boolean, verbose?: boolean }} options
 * @returns {Promise<{ width: number, height: number, detected: boolean, confidence: number }>}
 */
async function processImageFile(inputPath, outputPath, options = {}) {
  const { processImage } = await import('../core/gemini/imageProcessor.js')

  // Decode image using sharp (Node.js image processing)
  let imageData, width, height

  try {
    const sharp = (await import('sharp')).default
    const image = sharp(inputPath)
    const metadata = await image.metadata()
    width = metadata.width
    height = metadata.height

    // Get raw RGBA pixel data
    const rawBuffer = await image.ensureAlpha().raw().toBuffer()
    const data = new Uint8ClampedArray(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.length)
    imageData = { data, width, height }
  } catch {
    // Fallback: use Canvas-like approach with raw file reading
    // This requires the 'canvas' package or similar
    throw new Error(
      'Image decoding requires the "sharp" package.\n' +
      'Install it with: npm install sharp'
    )
  }

  // Process
  const result = processImage(imageData, { skipDetection: options.skipDetection })

  if (options.verbose) {
    if (result.processed) {
      console.log(`  Watermark detected at (${result.position.x}, ${result.position.y})`)
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`)
      console.log(`  Region: ${result.position.width}×${result.position.height}`)
    } else {
      console.log(`  Not processed: ${result.reason}`)
    }
  }

  if (!result.processed) {
    // Copy file unchanged if no watermark detected
    const inputData = await readFile(inputPath)
    await writeFile(outputPath, inputData)
    return { width, height, detected: false, confidence: 0 }
  }

  // Encode output using sharp
  const sharp = (await import('sharp')).default
  const outputBuffer = Buffer.from(result.imageData.data.buffer)
  const outputExt = extname(outputPath).toLowerCase()

  let encoder = sharp(outputBuffer, { raw: { width, height, channels: 4 } })

  if (outputExt === '.png') {
    encoder = encoder.png()
  } else if (outputExt === '.jpg' || outputExt === '.jpeg') {
    encoder = encoder.jpeg({ quality: options.quality || 95 })
  } else if (outputExt === '.webp') {
    encoder = encoder.webp({ quality: options.quality || 95 })
  } else {
    encoder = encoder.png()
  }

  await encoder.toFile(outputPath)

  return {
    width,
    height,
    detected: true,
    confidence: result.confidence,
  }
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP)
    process.exit(0)
  }

  const command = argv[0]
  if (command !== 'remove') {
    console.error(`Unknown command: ${command}\nRun "vwr --help" for usage.`)
    process.exit(1)
  }

  const { values, positionals } = parseArgs({
    args: argv.slice(1),
    options: {
      output: { type: 'string', short: 'o' },
      overwrite: { type: 'boolean', default: false },
      format: { type: 'string', short: 'f' },
      quality: { type: 'string', short: 'q' },
      'skip-detect': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  })

  const inputFile = positionals[0]
  if (!inputFile) {
    console.error('Error: No input file specified.\nUsage: vwr remove <input>')
    process.exit(1)
  }

  const inputPath = resolve(inputFile)
  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`)
    process.exit(1)
  }

  const fileType = detectFileType(inputPath)
  if (fileType === 'unknown') {
    console.error(`Error: Unsupported file type: ${extname(inputPath)}\nSupported: ${[...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS].join(', ')}`)
    process.exit(1)
  }

  // Determine output path
  const ext = extname(inputPath)
  const base = basename(inputPath, ext)
  const outputExt = fileType === 'image'
    ? getOutputExtension(ext, values.format)
    : ext || '.mp4'
  const outputPath = values.output
    ? resolve(values.output)
    : resolve(inputPath, '..', `${base}_clean${outputExt}`)

  if (existsSync(outputPath) && !values.overwrite) {
    console.error(`Error: Output file already exists: ${outputPath}\nUse --overwrite to replace.`)
    process.exit(1)
  }

  const quality = values.quality ? parseInt(values.quality, 10) : 95

  try {
    const startTime = Date.now()

    if (fileType === 'image') {
      if (!values.json) {
        console.log(`Processing image: ${inputPath}`)
      }

      const result = await processImageFile(inputPath, outputPath, {
        skipDetection: values['skip-detect'],
        verbose: values.verbose,
        quality,
      })
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

      if (values.json) {
        console.log(JSON.stringify({
          success: true,
          type: 'image',
          input: inputPath,
          output: outputPath,
          width: result.width,
          height: result.height,
          detected: result.detected,
          confidence: result.confidence,
          elapsed: parseFloat(elapsed),
        }))
      } else {
        if (result.detected) {
          console.log(`✓ Watermark removed in ${elapsed}s → ${outputPath}`)
        } else {
          console.log(`⚠ No watermark detected, file copied unchanged → ${outputPath}`)
        }
      }
    } else {
      // Video processing (existing Veo logic)
      const onProgress = values.verbose || !values.json
        ? (current, total) => {
            if (!values.json) {
              const pct = total > 0 ? Math.round((current / total) * 100) : 0
              process.stdout.write(`\rProcessing: ${current}/${total} frames (${pct}%)`)
            }
          }
        : undefined

      const result = await processVideoFile(inputPath, outputPath, { onProgress })
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

      if (values.json) {
        console.log(JSON.stringify({
          success: true,
          type: 'video',
          input: inputPath,
          output: outputPath,
          size: result.size,
          elapsed: parseFloat(elapsed),
        }))
      } else {
        process.stdout.write('\n')
        console.log(`✓ Done in ${elapsed}s → ${outputPath}`)
      }
    }
  } catch (err) {
    if (values.json) {
      console.log(JSON.stringify({ success: false, error: err.message }))
    } else {
      console.error(`\nError: ${err.message}`)
    }
    process.exit(1)
  }
}
