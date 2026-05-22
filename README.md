# Veo Watermark Remover — Lossless Video Watermark Removal Tool

An open-source tool to remove Google Veo watermarks from AI-generated videos with pixel-perfect, reproducible results. Built with pure JavaScript, the engine uses a mathematically exact Reverse Alpha Blending algorithm instead of unpredictable AI inpainting.

> 🚀 Looking for the `Online Veo Watermark Remover`? Try [removegeminiwatermark.io](https://removegeminiwatermark.io/) — free, no install, works directly in your browser.

[Online Tool](https://removegeminiwatermark.io/)  [CLI](#cli)  [Browser SDK](#programmatic-browser)  [Node.js SDK](#programmatic-nodejs)

[中文文档](README_zh.md)

---

## Features

- ✅ **100% Local Processing** - All video processing happens locally in your browser or on your machine. Nothing is uploaded.
- ✅ **Mathematical Precision** - Based on the Reverse Alpha Blending formula, not "hallucinating" AI models.
- ✅ **Frame-by-Frame Restoration** - Every frame is processed individually with pixel-exact accuracy.
- ✅ **Audio Passthrough** - Audio track is preserved without re-encoding.
- ✅ **Dual Video Backend** - WebCodecs API (browser, hardware-accelerated) + ffmpeg.wasm (Node.js / fallback).
- ✅ **Flexible Usage** - Online tool for quick use, CLI for scripting and automation, SDK for integration.
- ✅ **Cross-Platform** - Works in modern browsers (Chrome 94+, Edge 94+) and Node.js environments.

## ⚠️ Disclaimer

> **USE AT YOUR OWN RISK**
>
> This tool modifies video files. While it is designed to work reliably, unexpected results may occur due to:
> - Variations in Veo's watermark implementation
> - Corrupted or unusual video formats
> - Edge cases not covered by testing
>
> The author assumes no responsibility for any data loss, video corruption, or unintended modifications.

## How to Remove Veo Watermarks

### Online Veo Watermark Remover (Recommended)

For all users — the fastest and easiest way to remove Veo watermarks from videos:

1. Open [removegeminiwatermark.io](https://removegeminiwatermark.io/).
2. Drag and drop or click to select your Veo-generated video.
3. The engine will automatically process and remove the watermark frame by frame.
4. Download the cleaned video.

### CLI

For scripting, CI, and local batch workflows:

```bash
# Using npx (zero install)
npx gemini-veo-watermark-remover remove input.mp4 -o output.mp4

# Or install globally
npm i -g gemini-veo-watermark-remover
vwr remove input.mp4
vwr remove input.mp4 --output clean.mp4 --overwrite
vwr remove input.mp4 --json  # machine-readable output
```

### Programmatic (Node.js)

```js
import { processVideoFile } from 'gemini-veo-watermark-remover/node';

await processVideoFile('input.mp4', 'output.mp4', {
  onProgress: (current, total) => {
    console.log(`Processing: ${current}/${total} frames`);
  }
});
```

### Programmatic (Browser)

```js
import { processVideoFile } from 'gemini-veo-watermark-remover/browser';

const blob = await processVideoFile(file, {
  onProgress: (current, total) => {
    updateProgressBar(current / total);
  }
});

// Trigger download
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'output.mp4';
a.click();
```

### Can't Remove Your Watermark?

This tool targets Veo's visible watermark (the semi-transparent "Veo" text in the bottom-right corner). If your video watermark doesn't match a known Veo format, or you need to remove other types of watermarks, a general-purpose AI video watermark remover may be required.

## Development

```bash
# Install dependencies
npm install

# Build all bundles
node build.js

# Watch mode
node build.js --watch
```

## SDK Usage

The package exposes multiple entry points:

```js
// Universal (auto-detects environment)
import { processVideo, createFrameProcessor } from 'gemini-veo-watermark-remover';

// Browser-specific (prefers WebCodecs)
import { processVideoFile } from 'gemini-veo-watermark-remover/browser';

// Node.js-specific (file system API)
import { processVideoFile } from 'gemini-veo-watermark-remover/node';
```

Core utilities for advanced use:

```js
import {
  removeWatermark,
  createFrameProcessor,
  getVeoWatermarkInfo,
  registerAlphaMap,
} from 'gemini-veo-watermark-remover';

// Process a single frame
const processor = createFrameProcessor(1920, 1080);
const result = processor.process(imageData);
console.log(result.processed); // true
```

## How Veo Watermark Removal Works

### The Veo Watermarking Process

Veo applies watermarks using standard alpha compositing:

```
watermarked = α · logo + (1 - α) · original
```

Where:
- `watermarked`: The pixel value with the watermark
- `α`: The Alpha channel value (0.0 – 1.0)
- `logo`: The watermark color value (White = 255)
- `original`: The raw, original pixel value we want to recover

### The Reverse Solution

To remove the watermark, we solve for `original`:

```
original = (watermarked - α · logo) / (1 - α)
```

By calibrating the exact Alpha map from known Veo video outputs, we reconstruct the original pixels with zero loss — applied to every frame in the video.

## Supported Resolutions

| Resolution | Orientation | Watermark Size | Status |
|-----------|-------------|----------------|--------|
| 1280×720  | Landscape   | 80×28 px       | ✅ |
| 720×1280  | Portrait    | 80×28 px       | ✅ |
| 1920×1080 | Landscape   | 120×42 px      | ✅ |
| 1080×1920 | Portrait    | 120×42 px      | ✅ |

## Project Structure

```
gemini-veo-watermark-remover/
├── bin/
│   └── vwr.mjs              # CLI entry point
├── src/
│   ├── core/
│   │   ├── blendModes.js        # Reverse alpha blending algorithm
│   │   ├── veoConfig.js         # Watermark position catalog
│   │   ├── embeddedAlphaMaps.js # Pre-calibrated alpha maps
│   │   └── frameProcessor.js    # Per-frame processing orchestrator
│   ├── video/
│   │   ├── videoDecoder.js      # Decode abstraction (WebCodecs + ffmpeg.wasm)
│   │   ├── videoEncoder.js      # Encode abstraction (mp4-muxer + ffmpeg.wasm)
│   │   └── pipeline.js          # Full decode→process→encode pipeline
│   ├── sdk/
│   │   ├── index.js             # Universal entry point
│   │   ├── browser.js           # Browser-optimized API
│   │   └── node.js              # Node.js file-system API
│   └── cli/
│       └── vwrCli.js            # CLI argument parsing and execution
├── dist/                         # Build output
├── build.js                      # esbuild build script
└── package.json
```

## Architecture Overview

- `src/core/` contains the reverse-alpha removal math, watermark position detection, and alpha map management.
- `src/video/` implements the video decode/encode pipeline with dual backends (WebCodecs for browser, ffmpeg.wasm for Node.js).
- `src/sdk/` provides the public API surface for universal, browser, and Node.js usage.
- `src/cli/` and `bin/vwr.mjs` expose file-oriented local automation.

## Runtime Requirements

### Browser
- Chrome 94+ / Edge 94+ (WebCodecs API)
- ES modules, Canvas API, TypedArray (`Float32Array`, `Uint8ClampedArray`)

### Node.js / CLI
- Node.js 18+
- ffmpeg.wasm runtime (~25MB WASM download on first use)

## Limitations

- Only removes Veo visible watermarks (the semi-transparent "Veo" text in bottom-right)
- Does not remove invisible/steganographic watermarks (e.g., SynthID)
- Designed for Veo's current visible watermark pattern
- Alpha maps are placeholder — full calibration requires Veo video samples (contributions welcome)
- Video processing speed: ~2-5x real-time in browser, slower via ffmpeg.wasm

## Legal Disclaimer

This project is released under the MIT License.

The removal of watermarks may have legal implications depending on your jurisdiction and the intended use of the videos. Users are solely responsible for ensuring their use of this tool complies with applicable laws, terms of service, and intellectual property rights.

The author does not condone or encourage the misuse of this tool for copyright infringement, misrepresentation, or any other unlawful purposes.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF THIS SOFTWARE.

## Credits

This project is a JavaScript port of the [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover) by Allen Kuo ([@allenk](https://github.com/allenk)).

The Reverse Alpha Blending method and calibrated watermark approach are based on the original work © 2024 AllenK (Kwyshell), licensed under MIT License.

## Related Links

- [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover) — Original C++ implementation by Allen Kuo
- [Removing Gemini AI Watermarks: A Deep Dive into Reverse Alpha Blending](https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f) — Technical writeup by the original author
- [GargantuaX/gemini-watermark-remover](https://github.com/GargantuaX/gemini-watermark-remover) — Sister project for Gemini image watermark removal

## License

[MIT License](LICENSE)
