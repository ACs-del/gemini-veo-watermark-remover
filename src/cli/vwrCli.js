/**
 * CLI implementation for gemini-veo-watermark-remover.
 * Supports both video (Veo) and image (Gemini) watermark removal.
 *
 * Usage:
 *   pictx remove <input> [options]
 *
 * Detects file type by extension and routes to the appropriate processor.
 */

import { parseArgs } from 'node:util'
import { resolve, basename, extname, join } from 'node:path'
import { existsSync, statSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { processVideoFile } from '../sdk/node.js'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv'])

const HELP = `
pictx — Gemini/Veo Watermark Remover CLI

Usage:
  pictx remove <input> [options]

Commands:
  remove    Remove watermark from a video or image file

Options:
  --output, -o     Output file path (default: <input>_clean.<ext>)
  --out-dir        Output directory for batch mode (writes <name>_clean.<ext>)
  --overwrite      Overwrite output if it exists
  --format, -f     Output format for images (png, jpeg, webp) [default: same as input]
  --quality, -q    Output quality for lossy formats (0-100) [default: 95]
  --skip-detect    Skip NCC detection, use expected position directly
  --adaptive       Restoration validation: auto (default) or off
  --max-passes     Max profile/pass attempts for images [default: 4]
  --legacy         Images: legacy Gemini profile only. Videos: old "Veo" text watermark
  --no-legacy      Use current Gemini 3.5+ profile only, no fallback
  --json           Output result as JSON
  --verbose        Show detailed progress
  --help, -h       Show this help

Supported formats:
  Images: PNG, JPEG, WebP, BMP, TIFF (Gemini watermark)
  Videos: MP4, WebM, MOV, AVI, MKV (Veo watermark)

Examples:
  pictx remove image.png
  pictx remove image.jpg -o clean.png --format png
  pictx remove video.mp4  # Gemini 3.5+ diamond video watermark
  pictx remove old-veo-video.mp4 --legacy
  pictx remove video.mp4 -o clean.mp4 --verbose
  pictx remove old-gemini.png --legacy
  pictx remove image.jpg --no-legacy
  pictx remove ./photos --out-dir ./clean
  pictx remove image.jpg --json  # machine-readable output

Exit codes:
  0  Processed successfully
  1  Single image skipped because no watermark was detected
  2  Real failure, such as bad args, IO error, or conflicting flags
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

function isSupportedFile(filePath) {
  return detectFileType(filePath) !== 'unknown'
}

/**
 * Collect input files for single or batch processing.
 * @param {string} inputPath
 * @returns {Promise<string[]>}
 */
async function collectInputFiles(inputPath) {
  const stat = statSync(inputPath)
  if (stat.isFile()) return [inputPath]

  if (!stat.isDirectory()) {
    throw new Error(`Input is not a file or directory: ${inputPath}`)
  }

  const entries = await readdir(inputPath)
  return entries
    .map((name) => join(inputPath, name))
    .filter((filePath) => existsSync(filePath) && statSync(filePath).isFile() && isSupportedFile(filePath))
    .sort()
}

function buildOutputPath(inputPath, values, fileType, outDir) {
  const ext = extname(inputPath)
  const base = basename(inputPath, ext)
  const outputExt = fileType === 'image'
    ? getOutputExtension(ext, values.format)
    : ext || '.mp4'

  if (outDir) {
    return join(resolve(outDir), `${base}_clean${outputExt}`)
  }

  if (values.output) {
    return resolve(values.output)
  }

  return resolve(inputPath, '..', `${base}_clean${outputExt}`)
}

/**
 * Process an image file using the Gemini engine.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {{ skipDetection?: boolean, verbose?: boolean, profile?: 'auto'|'current'|'legacy', adaptiveMode?: 'auto'|'off', maxPasses?: number }} options
 * @returns {Promise<{ width: number, height: number, detected: boolean, skipped: boolean, confidence: number, profile: string|null, attemptedProfiles: string[], decisionTier: string|null }>}
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
  const result = processImage(imageData, {
    skipDetection: options.skipDetection,
    profile: options.profile ?? 'auto',
    adaptiveMode: options.adaptiveMode ?? 'auto',
    maxPasses: options.maxPasses,
  })

  if (options.verbose) {
    if (result.processed) {
      console.log(`  Watermark detected at (${result.position.x}, ${result.position.y})`)
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`)
      console.log(`  Region: ${result.position.width}×${result.position.height}`)
      console.log(`  Profile: ${result.profile}`)
      if (result.decisionTier) console.log(`  Decision: ${result.decisionTier}`)
    } else {
      console.log(`  Not processed: ${result.reason}`)
      console.log(`  Profiles tried: ${(result.attemptedProfiles || []).join(', ')}`)
    }
  }

  if (!result.processed) {
    const inputData = await readFile(inputPath)
    await writeFile(outputPath, inputData)
    return {
      width,
      height,
      detected: false,
      skipped: true,
      confidence: 0,
      profile: result.profile,
      attemptedProfiles: result.attemptedProfiles || [],
      decisionTier: result.decisionTier ?? null,
    }
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
    skipped: false,
    confidence: result.confidence,
    profile: result.profile,
    attemptedProfiles: result.attemptedProfiles || [],
    decisionTier: result.decisionTier ?? null,
  }
}

async function processSingleInput(inputPath, values, profile, adaptiveMode, maxPasses, emitJson = values.json) {
  const fileType = detectFileType(inputPath)
  if (fileType === 'unknown') {
    throw new Error(`Unsupported file type: ${extname(inputPath)}`)
  }

  const outDir = values['out-dir'] ? resolve(values['out-dir']) : null
  const outputPath = buildOutputPath(inputPath, values, fileType, outDir)

  if (outDir) {
    await mkdir(outDir, { recursive: true })
  }

  if (existsSync(outputPath) && !values.overwrite) {
    throw new Error(`Output file already exists: ${outputPath}\nUse --overwrite to replace.`)
  }

  const startTime = Date.now()

  if (fileType === 'image') {
    if (!emitJson) {
      console.log(`Processing image: ${inputPath}`)
    }

    const result = await processImageFile(inputPath, outputPath, {
      skipDetection: values['skip-detect'],
      verbose: values.verbose,
      quality: values.quality ? parseInt(values.quality, 10) : 95,
      profile,
      adaptiveMode,
      maxPasses,
    })
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (emitJson) {
      console.log(JSON.stringify({
        success: result.detected,
        type: 'image',
        input: inputPath,
        output: outputPath,
        width: result.width,
        height: result.height,
        detected: result.detected,
        skipped: result.skipped,
        confidence: result.confidence,
        profile: result.profile,
        attemptedProfiles: result.attemptedProfiles,
        decisionTier: result.decisionTier,
        elapsed: parseFloat(elapsed),
      }))
    } else if (result.detected) {
      console.log(`✓ Watermark removed in ${elapsed}s → ${outputPath}`)
    } else {
      console.log(`⚠ No watermark detected, file copied unchanged → ${outputPath}`)
    }

    return { detected: result.detected, skipped: result.skipped, type: 'image' }
  }

  const videoProfile = values.legacy ? 'legacy' : 'diamond'
  const onProgress = values.verbose || !values.json
    ? (current, total) => {
        if (!values.json) {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0
          process.stdout.write(`\rProcessing: ${current}/${total} frames (${pct}%)`)
        }
      }
    : undefined

  const result = await processVideoFile(inputPath, outputPath, { onProgress, videoProfile })
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  if (values.json) {
    console.log(JSON.stringify({
      success: !result.skipped,
      type: 'video',
      input: inputPath,
      output: outputPath,
      size: result.size,
      detected: !result.skipped,
      skipped: Boolean(result.skipped),
      reason: result.reason || null,
      profile: result.profile || videoProfile,
      processedFrames: result.processedFrames || 0,
      skippedFrames: result.skippedFrames || 0,
      elapsed: parseFloat(elapsed),
    }))
  } else {
    process.stdout.write('\n')
    if (result.skipped) {
      console.log(`⚠ No supported ${videoProfile} video watermark processed (${result.reason || 'not_processed'}), video encoded unchanged → ${outputPath}`)
      if (videoProfile === 'diamond') {
        console.log('  For pre-Gemini-3.5 videos with the old "Veo" text watermark, re-run with --legacy.')
      }
    } else {
      console.log(`✓ ${videoProfile} video watermark removed in ${elapsed}s → ${outputPath}`)
    }
  }

  return { detected: !result.skipped, skipped: Boolean(result.skipped), type: 'video' }
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP)
    process.exit(0)
  }

  const command = argv[0]
  if (command !== 'remove') {
    console.error(`Unknown command: ${command}\nRun "pictx --help" for usage.`)
    process.exit(2)
  }

  const { values, positionals } = parseArgs({
    args: argv.slice(1),
    options: {
      output: { type: 'string', short: 'o' },
      'out-dir': { type: 'string' },
      overwrite: { type: 'boolean', default: false },
      format: { type: 'string', short: 'f' },
      quality: { type: 'string', short: 'q' },
      'skip-detect': { type: 'boolean', default: false },
      adaptive: { type: 'string', default: 'auto' },
      'max-passes': { type: 'string', default: '4' },
      legacy: { type: 'boolean', default: false },
      'no-legacy': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  })

  if (values.output && values['out-dir']) {
    const msg = 'Cannot specify both --output and --out-dir'
    if (values.json) console.log(JSON.stringify({ success: false, error: msg }))
    else console.error(`Error: ${msg}`)
    process.exit(2)
  }

  if (values.legacy && values['no-legacy']) {
    if (values.json) {
      console.log(JSON.stringify({
        success: false,
        error: 'Cannot specify both --legacy and --no-legacy',
      }))
    } else {
      console.error('Error: Cannot specify both --legacy and --no-legacy')
    }
    process.exit(2)
  }

  const adaptiveMode = values.adaptive === 'off' ? 'off' : 'auto'
  const maxPasses = Math.max(1, parseInt(values['max-passes'], 10) || 4)

  const inputFile = positionals[0]
  if (!inputFile) {
    console.error('Error: No input file specified.\nUsage: pictx remove <input>')
    process.exit(2)
  }

  const inputPath = resolve(inputFile)
  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`)
    process.exit(2)
  }

  const profile = values.legacy
    ? 'legacy'
    : values['no-legacy']
      ? 'current'
      : 'auto'

  try {
    const inputFiles = await collectInputFiles(inputPath)
    if (inputFiles.length === 0) {
      throw new Error(`No supported image/video files found in: ${inputPath}`)
    }

    const isBatch = inputFiles.length > 1 || statSync(inputPath).isDirectory()
    if (isBatch && values.output && !values['out-dir']) {
      throw new Error('Use --out-dir for directory/batch processing instead of --output')
    }

    let skippedImages = 0
    const batchResults = []

    for (const filePath of inputFiles) {
      const perFileValues = { ...values }
      if (isBatch) {
        perFileValues.output = undefined
      }

      const result = await processSingleInput(
        filePath,
        perFileValues,
        profile,
        adaptiveMode,
        maxPasses,
        values.json && !isBatch,
      )
      batchResults.push({ input: filePath, ...result })
      if (result.type === 'image' && !result.detected) skippedImages++
    }

    if (isBatch && values.json) {
      console.log(JSON.stringify({
        success: skippedImages < inputFiles.length,
        batch: true,
        count: inputFiles.length,
        skippedImages,
        results: batchResults,
      }))
    } else if (!values.json && isBatch) {
      console.log(`Batch complete: ${inputFiles.length} file(s), ${skippedImages} image(s) skipped (no watermark detected)`)
    }

    if (!isBatch && batchResults[0]?.type === 'image' && !batchResults[0]?.detected) {
      process.exitCode = 1
    }
  } catch (err) {
    if (values.json) {
      console.log(JSON.stringify({ success: false, error: err.message }))
    } else {
      console.error(`\nError: ${err.message}`)
    }
    process.exit(2)
  }
}
