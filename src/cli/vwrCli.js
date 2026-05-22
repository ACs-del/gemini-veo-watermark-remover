/**
 * CLI implementation for veo-watermark-remover.
 * Usage: vwr remove <input.mp4> --output <output.mp4>
 */

import { parseArgs } from 'node:util';
import { resolve, basename, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { processVideoFile } from '../sdk/node.js';

const HELP = `
vwr — Veo Watermark Remover CLI

Usage:
  vwr remove <input> [options]

Commands:
  remove    Remove Veo watermark from a video file

Options:
  --output, -o     Output file path (default: <input>_clean.mp4)
  --overwrite      Overwrite output if it exists
  --json           Output result as JSON
  --verbose        Show detailed progress
  --help, -h       Show this help

Examples:
  vwr remove video.mp4
  vwr remove video.mp4 -o clean.mp4
  vwr remove video.mp4 --json
`;

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP);
    process.exit(0);
  }

  const command = argv[0];
  if (command !== 'remove') {
    console.error(`Unknown command: ${command}\nRun "vwr --help" for usage.`);
    process.exit(1);
  }

  const { values, positionals } = parseArgs({
    args: argv.slice(1),
    options: {
      output: { type: 'string', short: 'o' },
      overwrite: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const inputFile = positionals[0];
  if (!inputFile) {
    console.error('Error: No input file specified.\nUsage: vwr remove <input.mp4>');
    process.exit(1);
  }

  const inputPath = resolve(inputFile);
  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  // Determine output path
  const ext = extname(inputPath);
  const base = basename(inputPath, ext);
  const outputPath = values.output
    ? resolve(values.output)
    : resolve(inputPath, '..', `${base}_clean${ext || '.mp4'}`);

  if (existsSync(outputPath) && !values.overwrite) {
    console.error(`Error: Output file already exists: ${outputPath}\nUse --overwrite to replace.`);
    process.exit(1);
  }

  // Progress display
  const onProgress = values.verbose || !values.json
    ? (current, total) => {
        if (!values.json) {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          process.stdout.write(`\rProcessing: ${current}/${total} frames (${pct}%)`);
        }
      }
    : undefined;

  try {
    const startTime = Date.now();
    const result = await processVideoFile(inputPath, outputPath, { onProgress });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!values.json) {
      process.stdout.write('\n');
      console.log(`✓ Done in ${elapsed}s → ${outputPath}`);
    } else {
      console.log(JSON.stringify({
        success: true,
        input: inputPath,
        output: outputPath,
        size: result.size,
        elapsed: parseFloat(elapsed),
      }));
    }
  } catch (err) {
    if (values.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`\nError: ${err.message}`);
    }
    process.exit(1);
  }
}
