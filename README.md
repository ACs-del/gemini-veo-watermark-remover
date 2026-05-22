# Gemini & Veo Watermark Remover — Lossless Watermark Removal Tool

An open-source tool to remove **Gemini image watermarks** and **Veo video watermarks** from AI-generated content with pixel-perfect, reproducible results. Built with pure JavaScript, the engine uses a mathematically exact **Reverse Alpha Blending** algorithm instead of unpredictable AI inpainting.

🚀 **Looking for the `Online Watermark Remover`?** Try [removegeminiwatermark.io](https://removegeminiwatermark.io) — free, no install, works directly in your browser.

💡 **Need to remove other AI watermarks?** Try our general-purpose AI watermark remover (coming soon).

## Features

- ✅ **Gemini + Veo** — First tool to handle both Gemini image and Veo video watermarks
- ✅ **100% Local Processing** — All processing happens locally. Nothing is uploaded.
- ✅ **Mathematical Precision** — Reverse Alpha Blending formula, not AI hallucination.
- ✅ **Auto-Detection** — NCC template matching identifies watermark size and position.
- ✅ **Flexible Usage** — Online tool, Chrome extension, userscript, CLI, SDK, and AI Agent Skill.
- ✅ **Cross-Platform** — Works in modern browsers and Node.js environments.

## Watermark Removal Examples

| Original Image | Watermark Removed |
| --- | --- |
| ![Before](https://removegeminiwatermark.io/images/demo-before.webp) | ![After](https://removegeminiwatermark.io/images/demo-after.webp) |

## How to Remove Watermarks

### Online Watermark Remover (Recommended)

The fastest and easiest way — works for both Gemini images and Veo videos:

1. Open [removegeminiwatermark.io](https://removegeminiwatermark.io).
2. Drag and drop your Gemini image or Veo video.
3. The engine will automatically process and remove the watermark.
4. Download the cleaned file.

### Chrome Extension

Automatically removes watermarks from Gemini-generated images on Gemini pages:

1. Install from the Chrome Web Store (coming soon) or load unpacked from `src/extension/`.
2. Open Gemini. The extension automatically processes supported images.
3. Preview, copy, and download actions all return cleaned images.

### Userscript (Tampermonkey / Violentmonkey)

1. Install a userscript manager (e.g., Tampermonkey).
2. Install `gemini-veo-watermark-remover.user.js` from `src/userscript/`.
3. Navigate to Gemini conversation pages.
4. Images are automatically cleaned in-place.

### CLI

For scripting, CI, and local batch workflows:

```bash
# Using npx (zero install)
npx gemini-veo-watermark-remover remove image.png
npx gemini-veo-watermark-remover remove video.mp4

# Or install globally
npm i -g gemini-veo-watermark-remover
vwr remove image.png -o clean.png
vwr remove video.mp4 --verbose
vwr remove image.jpg --json  # machine-readable output
```

Supported formats:
- **Images**: PNG, JPEG, WebP, BMP, TIFF (Gemini watermark)
- **Videos**: MP4, WebM, MOV, AVI, MKV (Veo watermark)

### SDK Usage

```javascript
// Browser — remove Gemini watermark from image
import { removeGeminiWatermark } from 'gemini-veo-watermark-remover/browser';

const { blob, detected, confidence } = await removeGeminiWatermark(file);
if (detected) {
  const url = URL.createObjectURL(blob);
  // Use cleaned image...
}

// Browser — process Veo video
import { processVideoFile } from 'gemini-veo-watermark-remover/browser';

const cleanBlob = await processVideoFile(videoFile, {
  onProgress: (current, total) => console.log(`${current}/${total} frames`),
});

// Node.js — file-based API
import { processVideoFile } from 'gemini-veo-watermark-remover/node';
await processVideoFile('input.mp4', 'output.mp4');

// Gemini-only lightweight import (no video deps)
import { processImage, createImageProcessor } from 'gemini-veo-watermark-remover/gemini';
```

### Can't Remove Your Watermark?

This tool targets **Gemini's visible watermark** (logo/star overlay) and **Veo's visible text watermark**. For other types of watermarks, try our general-purpose AI watermark remover (coming soon).

## How It Works

### The Watermarking Process

Both Gemini and Veo apply watermarks using standard alpha compositing:

$$watermarked = \alpha \cdot logo + (1 - \alpha) \cdot original$$

### The Reverse Solution

We solve for the original pixel value:

$$original = \frac{watermarked - \alpha \cdot logo}{1 - \alpha}$$

By calibrating the exact Alpha map from known outputs, we reconstruct the original pixels with zero loss.

### Detection

1. **Size catalog lookup** — matches image dimensions to predict watermark size (48×48 or 96×96 for Gemini).
2. **NCC template matching** — Normalized Cross-Correlation search in the bottom-right region.
3. **Confidence threshold** — only applies removal when detection confidence ≥ 50%.

## Supported Formats

### Gemini Image Watermarks

| Condition | Watermark Size | Right Margin | Bottom Margin |
| --- | --- | --- | --- |
| Larger outputs (>1024px) | 96×96 | 64px | 64px |
| Smaller outputs (≤1024px) | 48×48 | 32px | 32px |

### Veo Video Watermarks

| Resolution | Orientation | Watermark Size | Status |
| --- | --- | --- | --- |
| 1280×720 | Landscape | 80×28 px | ✅ |
| 720×1280 | Portrait | 80×28 px | ✅ |
| 1920×1080 | Landscape | 120×42 px | ✅ |
| 1080×1920 | Portrait | 120×42 px | ✅ |

## Project Structure

```
gemini-veo-watermark-remover/
├── bin/                     # CLI entrypoint (vwr)
├── src/
│   ├── core/
│   │   ├── blendModes.js        # Shared reverse alpha blending algorithm
│   │   ├── veoConfig.js         # Veo watermark position catalog
│   │   ├── embeddedAlphaMaps.js # Veo alpha map registry
│   │   ├── frameProcessor.js    # Per-frame video processing
│   │   └── gemini/              # Gemini image watermark module
│   │       ├── geminiConfig.js      # Size/position detection
│   │       ├── geminiAlphaMaps.js   # Alpha map management
│   │       ├── imageProcessor.js    # Image processing pipeline
│   │       └── index.js            # Re-exports
│   ├── video/
│   │   ├── videoDecoder.js      # WebCodecs + ffmpeg.wasm decoder
│   │   ├── videoEncoder.js      # mp4-muxer + ffmpeg.wasm encoder
│   │   └── pipeline.js          # Full video pipeline
│   ├── sdk/
│   │   ├── index.js             # Universal entry point
│   │   ├── browser.js           # Browser API
│   │   └── node.js              # Node.js file-system API
│   ├── cli/
│   │   └── vwrCli.js            # CLI implementation
│   ├── extension/               # Chrome Extension (Manifest V3)
│   └── userscript/              # Tampermonkey userscript
├── dist/                        # Build output
├── build.js                     # esbuild build script
└── package.json
```

## Development

```bash
# Install dependencies
npm install

# Build all bundles
node build.js

# Watch mode
node build.js --watch
```

## Limitations

- Only removes **visible** Gemini/Veo watermarks (logo overlay, text watermark)
- Does **not** remove invisible SynthID or steganographic watermarks
- Veo alpha maps are placeholder — [contribute calibrated maps](https://github.com/ACs-del/gemini-veo-watermark-remover/issues)

## Legal Disclaimer

This project is released under the MIT License. The removal of watermarks may have legal implications depending on your jurisdiction. Users are responsible for ensuring compliance with applicable laws.

## Credits

- Reverse Alpha Blending method based on [GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool) by Allen Kuo (MIT License)
- Veo video processing inspired by [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover)

## Related Links

- [Online Tool — removegeminiwatermark.io](https://removegeminiwatermark.io)
- [GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool) — Original C/C++ implementation
- [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover) — Original Veo CLI
- [Reverse Alpha Blending Deep Dive](https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f)

## License

MIT
