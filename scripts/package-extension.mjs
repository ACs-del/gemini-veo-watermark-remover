#!/usr/bin/env node
/**
 * Package the Chrome extension into dist/pictx-extension-v{version}.zip
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, '..')
const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'))
const version = pkg.version
const distDir = join(pkgRoot, 'dist')
const outPath = join(distDir, `pictx-extension-v${version}.zip`)
const extensionDir = join(pkgRoot, 'src', 'extension')

mkdirSync(distDir, { recursive: true })

const result = spawnSync(
  'zip',
  ['-r', outPath, '.'],
  { cwd: extensionDir, stdio: 'inherit' },
)

if (result.status !== 0) {
  console.error('Failed to create extension zip. Is `zip` installed?')
  process.exit(result.status ?? 1)
}

console.log(`Extension packaged: ${outPath}`)
