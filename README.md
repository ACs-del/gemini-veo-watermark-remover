# Gemini Veo Watermark Remover

[中文文档](README_zh.md)

Remove Google Veo video watermarks with pixel-perfect precision. Pure JavaScript, runs in-browser or Node.js — no server, no AI guesswork.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## How it works

Reverse alpha blending reconstructs the original pixels under the "Veo" watermark using a pre-calibrated alpha map:

```
original = (watermarked - α × 255) / (1 - α)
```

Every frame is restored mathematically — no neural network, no soft edges, no quality loss.

## Features

- **Pixel-exact restoration** — calibrated alpha maps for 720p and 1080p (landscape & portrait)
- **Dual video backend** — WebCodecs API (browser, hardware-accelerated) + ffmpeg.wasm (Node.js / fallback)
- **Audio passthrough** — audio track is preserved without re-encoding
- **CLI tool** — `vwr remove video.mp4` for batch/CI workflows
- **Browser SDK** — process videos entirely in the browser with zero uploads
- **Lightweight** — core algorithm is ~2KB, no heavy ML models

## Quick start

### Online (coming soon)

Visit [removegeminiwatermark.io](https://removegeminiwatermark.io) to process videos in your browser.

### CLI

```bash
npx gemini-veo-watermark-remover remove input.mp4 -o output.mp4
```

Or install globally:

```bash
npm i -g gemini-veo-watermark-remover
vwr remove input.mp4
```

### Programmatic (Node.js)

```js
import { processVideoFile } from 'gemini-veo-watermark-remover/node';

await processVideoFile('input.mp4', 'output.mp4', {
  onProgress: (current, total) => console.log(`${current}/${total} frames`)
});
```

### Programmatic (Browser)

```js
import { processVideoFile } from 'gemini-veo-watermark-remover/browser';

const blob = await processVideoFile(file, {
  onProgress: (current, total) => updateProgressBar(current / total)
});

// Download result
const url = URL.createObjectURL(blob);
```

## Supported resolutions

| Resolution | Orientation | Status |
|-----------|-------------|--------|
| 1280×720  | Landscape   | ✅ |
| 720×1280  | Portrait    | ✅ |
| 1920×1080 | Landscape   | ✅ |
| 1080×1920 | Portrait    | ✅ |

## Project structure

```
src/
├── core/           # Reverse alpha blending + watermark config
├── video/          # Decode/encode pipeline (WebCodecs + ffmpeg.wasm)
├── sdk/            # Entry points (index, browser, node)
└── cli/            # CLI implementation
bin/
└── vwr.mjs         # CLI entry point
```

## Development

```bash
npm install
node build.js        # Build all bundles
node build.js --watch
```

## How is this different from AI watermark removers?

| | This tool | AI inpainting |
|---|---|---|
| Method | Mathematical formula (deterministic) | Neural network (probabilistic) |
| Quality | Pixel-perfect on known Veo watermarks | Approximate, may blur or hallucinate |
| Speed | Real-time per frame | Seconds per frame |
| Scope | Veo watermarks only | Any watermark (less precise) |
| Privacy | 100% local | Often requires server upload |

## Contributing

1. Fork & clone
2. `npm install && node build.js`
3. Make changes in `src/`
4. Submit PR

**Alpha map calibration help wanted** — if you have Veo video samples, we need frame-differencing data to improve watermark maps. See [issues](https://github.com/ACs-del/gemini-veo-watermark-remover/issues).

## License

[MIT](LICENSE) © ACs-del
