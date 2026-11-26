#!/usr/bin/env node
/**
 * Agent skill entrypoint — wraps the pictx CLI for image/video watermark removal.
 *
 * Usage:
 *   node skills/gemini-veo-watermark-remover/scripts/run.mjs <input> [output] [--legacy] [--json]
 */

import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, '..', '..', '..')
const cliPath = join(pkgRoot, 'bin', 'pictx.mjs')

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

const release = 'https://github.com/ACs-del/gemini-veo-watermark-remover/releases/download/v0.3.0/pictx-gemini-veo-watermark-remover-0.3.0.tgz'
const result = existsSync(cliPath)
  ? spawnSync(process.execPath, [cliPath, 'remove', input, ...outputFlag], { stdio: 'inherit' })
  : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['exec', '--yes', '--package', release, '--', 'pictx', 'remove', input, ...outputFlag], { stdio: 'inherit' })
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
