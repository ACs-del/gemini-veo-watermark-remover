#!/usr/bin/env node
/**
 * Agent skill entrypoint — wraps the vwr CLI for image/video watermark removal.
 *
 * Usage:
 *   node skills/gemini-veo-watermark-remover/scripts/run.mjs <input> [output] [--legacy] [--json]
 */

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, '..', '..', '..')
const cliPath = join(pkgRoot, 'dist', 'cli.js')

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node ${fileURLToPath(import.meta.url)} <input> [output] [--legacy] [--json]`)
  process.exit(args.length === 0 ? 1 : 0)
}

const input = args[0]
const passthrough = args.slice(1)
const outputFlag = passthrough[0] && !passthrough[0].startsWith('-')
  ? ['--output', passthrough[0], ...passthrough.slice(1)]
  : passthrough

const result = spawnSync(
  process.execPath,
  [cliPath, 'remove', input, ...outputFlag],
  { stdio: 'inherit', cwd: pkgRoot },
)

process.exit(result.status ?? 1)
