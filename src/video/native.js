import { spawn } from 'node:child_process'
import { mkdtemp, rename, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createFrameProcessor } from '../core/frameProcessor.js'

/** @returns {Promise<{ width: number, height: number, fps: number, duration: number }>} */
async function probeVideo(filePath) {
  const args = [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,avg_frame_rate,duration',
    '-of', 'json',
    filePath,
  ];

  const output = await runCommand('ffprobe', args);
  const json = JSON.parse(output);
  const stream = json.streams?.[0];
  if (!stream) throw new Error(`No video stream in ${filePath}`);

  const fpsSource = stream.avg_frame_rate && stream.avg_frame_rate !== '0/0'
    ? stream.avg_frame_rate
    : stream.r_frame_rate;
  const [num, den] = fpsSource.split('/').map(Number);
  const fps = den ? num / den : Number(fpsSource) || 30;

  return {
    width: stream.width,
    height: stream.height,
    fps,
    duration: Number(stream.duration) || 0,
  };
}

function runCommand(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise(stdout);
      else reject(new Error(`${cmd} exited ${code}: ${stderr.trim() || stdout.trim()}`));
    });
  });
}


function start(args, children) {
  const child = spawn('ffmpeg', ['-nostdin', '-v', 'error', ...args], { stdio: ['pipe', 'pipe', 'pipe'] })
  children.push(child)
  let errorText = ''
  child.stderr.on('data', chunk => { errorText = (errorText + chunk).slice(-2048) })
  const finished = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', code => code === 0 ? resolve() : reject(new Error(errorText || 'ffmpeg failed')))
  })
  return { child, finished }
}

export async function processNative(inputPath, outputPath, options = {}) {
  if (resolve(inputPath) === resolve(outputPath)) throw new Error('Choose a different output path from the input file')
  const { width, height, fps, duration } = await probeVideo(inputPath)
  const processor = createFrameProcessor(width, height, options)
  const tmp = await mkdtemp(join(dirname(outputPath), '.pictx-'))
  const tempOutput = join(tmp, 'clean.mp4')
  const children = []
  let processedFrames = 0, skippedFrames = 0, reason
  try {
    const decoder = start(['-i', inputPath, '-map', '0:v:0', '-an', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], children)
    const encoder = start(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', width + 'x' + height, '-r', String(fps),
      '-i', 'pipe:0', '-i', inputPath, '-map', '0:v:0', '-map', '1:a?', '-c:a', 'copy', '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tempOutput], children)
    const frameBytes = width * height * 4
    async function* frames(chunks) {
      let frame = Buffer.allocUnsafe(frameBytes), filled = 0
      for await (const chunk of chunks) {
        let start = 0
        while (start < chunk.length) {
          const count = chunk.copy(frame, filled, start, start + Math.min(frameBytes - filled, chunk.length - start))
          filled += count
          start += count
          if (filled !== frameBytes) continue
          const data = new Uint8ClampedArray(frame.buffer, frame.byteOffset, frameBytes)
          const result = processor.process({ width, height, data })
          if (result.processed) processedFrames++
          else { skippedFrames++; reason = result.reason }
          options.onProgress?.(processedFrames + skippedFrames, Math.round(duration * fps))
          yield frame
          frame = Buffer.allocUnsafe(frameBytes)
          filled = 0
        }
      }
      if (filled) throw new Error('Incomplete decoded video frame')
    }
    await Promise.all([decoder.finished, encoder.finished, pipeline(decoder.child.stdout, frames, encoder.child.stdin)])
    const { size } = await stat(tempOutput)
    await rename(tempOutput, outputPath)
    return { inputPath, outputPath, size, profile: processor.profile, processedFrames, skippedFrames,
      skipped: !processedFrames, reason: processedFrames ? null : reason }
  } finally {
    for (const child of children) if (child.exitCode === null) child.kill()
    await rm(tmp, { recursive: true, force: true })
  }
}
