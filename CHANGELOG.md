# Changelog

All notable changes to `pictx` are documented here.

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
