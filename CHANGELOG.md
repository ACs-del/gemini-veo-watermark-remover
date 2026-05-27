# Changelog

All notable changes to `@pictx/gemini-veo-watermark-remover` are documented here.

## [0.2.3] - 2026-05-27

### Added

- README video before/after demos under `docs/demo/` (1080p diamond + 720p legacy)
- `scripts/process-video-native.mjs` for local video fixture generation via system ffmpeg
- Video fixture download and processing guide in `tests/fixtures/README.md`

### Changed

- Removed opening GPT Image 2 promo block from README files
- Gitignore large video regression fixtures under `tests/fixtures/videos/`

## [0.2.2] - 2026-05-26

### Changed

- npm package renamed from `pictx` to `@pictx/gemini-veo-watermark-remover` (CLI binary remains `pictx`)
- SDK imports now use `@pictx/gemini-veo-watermark-remover/browser`, `/node`, `/gemini`
- Skill identifier updated to `@pictx/gemini-veo-watermark-remover`

## [0.2.1] - 2026-05-26

### Added

- Restoration validation for Gemini image removal (`--adaptive auto|off`, `--max-passes`)
- CLI batch output via `--out-dir`
- Channel × media support matrix in README
- Image processor regression tests and GitHub Actions CI
- Extension copy interception aligned with userscript
- `CHANGELOG.md`, `RELEASE.md`, and `npm run package:extension`

### Changed

- npm package rebranded to `pictx` (CLI binary `pictx`)
- Extension/userscript descriptions clarify **images only** (Veo video via CLI/online tool)
- Extension popup adds Enable toggle guidance and video boundary note

## [0.2.0] - 2026-05-26

### Added

- Embedded calibrated alpha maps from GeminiWatermarkTool / VeoWatermarkRemover
- Gemini 3.5+ image profile with legacy fallback
- Veo diamond video profile with `--legacy` text watermark mode
- WebCodecs video audio passthrough
- Agent Skill bundle and CLI JSON output
