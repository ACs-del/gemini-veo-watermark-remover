[中文文档](README_zh.md)

> 🔥 Tired of Gemini and Veo watermarks? Try the more powerful **GPT Image 2** at [pictx.ai](https://pictx.ai) — free for a limited time.

# Gemini & Veo Watermark Remover — Lossless AI Watermark Removal Tool

An open-source tool to **remove Gemini image watermarks and Veo video watermarks** from supported AI-generated outputs with high-fidelity, reproducible results. Built with pure JavaScript, the engine uses a mathematically exact **Reverse Alpha Blending** algorithm instead of unpredictable AI inpainting.

🆕 **Gemini 3.5+ support** — images target the current Gemini profile by default with legacy fallback, and videos now default to the Gemini 3.5 diamond logo profile.

🚀 **Looking for the `Online Gemini & Veo Watermark Remover (Recommended)`? Try [removegeminiwatermark.io](https://removegeminiwatermark.io)** — free, no install, works directly in your browser.

💡 **Need to remove other image or video watermarks?** Try the general-purpose AI watermark remover: [pictx.ai/image-watermark-remover](https://pictx.ai/image-watermark-remover)

<p align="center">
  <a href="https://removegeminiwatermark.io/"><img src="https://img.shields.io/badge/🛠️_Online_Tool-removegeminiwatermark.io-blue?style=for-the-badge" alt="Online Tool"></a>&nbsp;
  <a href="https://www.npmjs.com/package/pictx"><img src="https://img.shields.io/badge/📦_npm-pictx-CB3837?style=for-the-badge" alt="npm package"></a>&nbsp;
  <a href="https://removegeminiwatermark.io/userscript/gemini-veo-watermark-remover.user.js"><img src="https://img.shields.io/badge/🐒_Userscript-Install-green?style=for-the-badge" alt="Userscript"></a>&nbsp;
  <a href="https://pictx.ai/image-watermark-remover"><img src="https://img.shields.io/badge/🧹_General_Remover-pictx.ai-111111?style=for-the-badge" alt="General AI Watermark Remover"></a>
</p>

<p align="center">
  <img src="https://count.getloli.com/@gemini-veo-watermark-remover?name=gemini-veo-watermark-remover&theme=minecraft&padding=7&offset=0&align=top&scale=1&pixelated=1&darkmode=auto" width="400" alt="visitor counter">
</p>

## Features

- ✅ **Gemini + Veo** — First tool to handle both Gemini image and Veo video watermarks
- ✅ **Gemini 3.5+ + Legacy** — Current 36×36/96×96 Gemini profile with automatic legacy fallback.
- ✅ **Gemini 3.5 Video Diamond** — Video mode follows upstream VeoWatermarkRemover v0.5.0: diamond logo by default, old "Veo" text via `--legacy`.
- ✅ **100% Local Processing** — All processing happens locally. Nothing is uploaded.
- ✅ **Mathematical Precision** — Reverse Alpha Blending formula, not AI hallucination.
- ✅ **Auto-Detection** — NCC template matching identifies watermark size and position.
- ✅ **Flexible Usage** — Online tool, Chrome extension, userscript, CLI, SDK, and AI Agent Skill.
- ✅ **Cross-Platform** — Works in modern browsers and Node.js environments.

## Channel × Media Support

Not every distribution channel handles both Gemini **images** and Veo **videos**. Use this matrix to pick the right tool:

| Channel | Gemini images | Veo videos | Notes |
| --- | :---: | :---: | --- |
| npm `pictx` SDK | ✅ | ✅ | `pictx/browser`, `pictx/node`, `pictx/gemini` |
| CLI `pictx remove` | ✅ | ✅ | Batch folders with `--out-dir` |
| Agent Skill | ✅ | ✅ | Wraps the CLI |
| [removegeminiwatermark.io](https://removegeminiwatermark.io) | ✅ | ✅ | Upload-based WebCodecs pipeline |
| Chrome extension | ✅ | ❌ | Gemini page images only; copy + download cleaned |
| Userscript | ✅ | ❌ | Gemini page images only |

For Veo videos from the browser, use the online tool or `npx pictx remove video.mp4`. The extension and userscript intentionally stay image-only because they integrate with Gemini chat previews, not whole-file video decoding.

## Watermark Removal Examples

| Original Image | Watermark Removed |
| --- | --- |
| ![Before](https://removegeminiwatermark.io/images/demo-before.webp) | ![After](https://removegeminiwatermark.io/images/demo-after.webp) |

## What's New

The video engine has been updated to follow [VeoWatermarkRemover v0.5.0-demo](https://github.com/allenk/VeoWatermarkRemover/releases/tag/v0.5.0-demo). Gemini 3.5+ video outputs now use the Gemini diamond logo instead of the old "Veo" text overlay, so `pictx remove video.mp4` targets the diamond profile by default.

Older pre-Gemini-3.5 videos with the "Veo" text watermark must be processed with `--legacy`. There is no automatic fallback between video profiles because the shapes and positions differ, and applying the wrong profile can damage the frame.

## How to Remove Watermarks

### Online Watermark Remover (Recommended)

The fastest and easiest way — works for both Gemini images and Veo videos:

1. Open [removegeminiwatermark.io](https://removegeminiwatermark.io).
2. Drag and drop your Gemini image or Veo video.
3. The engine will automatically process and remove the watermark.
4. Download the cleaned file.

### Chrome Extension (Gemini images only)

Automatically removes watermarks from Gemini-generated **images** on Gemini pages (not Veo videos):

1. Install from the Chrome Web Store (coming soon), load unpacked from `src/extension/`, or use the GitHub Release zip.
2. Open Gemini. The extension automatically processes supported images.
3. Preview, copy, and download actions return cleaned images.
4. If the page becomes slow, disable the extension from the popup and refresh Gemini.

### Userscript (Tampermonkey / Violentmonkey — Gemini images only)

1. Install a userscript manager (e.g., Tampermonkey).
2. Install `gemini-veo-watermark-remover.user.js` from `src/userscript/` or [removegeminiwatermark.io/userscript/](https://removegeminiwatermark.io/userscript/gemini-veo-watermark-remover.user.js).
3. Navigate to Gemini conversation pages.
4. Images are automatically cleaned in-place; native copy/download flows return cleaned results.

For Veo videos, use the [online tool](https://removegeminiwatermark.io) or CLI instead.

### CLI

For scripting, CI, and local batch workflows:

```bash
# Using npx (zero install)
npx pictx remove image.png
npx pictx remove video.mp4
npx pictx remove old-veo-video.mp4 --legacy

# Or install globally
npm i -g pictx
pictx remove image.png -o clean.png
pictx remove video.mp4 --verbose              # Gemini 3.5+ diamond logo
pictx remove old-veo-video.mp4 --legacy       # old "Veo" text watermark
pictx remove image.jpg --json  # machine-readable output
pictx remove old-gemini.png --legacy
pictx remove image.jpg --no-legacy
```

Supported formats:
- **Images**: PNG, JPEG, WebP, BMP, TIFF (Gemini watermark)
- **Videos**: MP4, WebM, MOV, AVI, MKV (Veo watermark)

### SDK Usage

```javascript
// Browser — remove Gemini watermark from image
import { removeGeminiWatermark } from 'pictx/browser';

const { blob, detected, confidence } = await removeGeminiWatermark(file);
if (detected) {
  const url = URL.createObjectURL(blob);
  // Use cleaned image...
}

// Browser — process Gemini 3.5+ diamond video
import { processVideoFile } from 'pictx/browser';

const cleanBlob = await processVideoFile(videoFile, {
  onProgress: (current, total) => console.log(`${current}/${total} frames`),
});

// Browser — process legacy "Veo" text videos
const legacyBlob = await processVideoFile(videoFile, { videoProfile: 'legacy' });

// Node.js — file-based API
import { processVideoFile } from 'pictx/node';
await processVideoFile('input.mp4', 'output.mp4');

// Gemini-only lightweight import (no video deps)
import { processImage, createImageProcessor } from 'pictx/gemini';
```

### Can't Remove Your Watermark?

This tool targets **Gemini's visible watermark** (logo/star overlay), **Gemini 3.5+ video diamond logos**, and **legacy Veo visible text watermarks**. For other types of watermarks, try our general-purpose AI watermark remover.

## How It Works

### The Watermarking Process

Both Gemini and Veo apply watermarks using standard alpha compositing:

$$watermarked = \alpha \cdot logo + (1 - \alpha) \cdot original$$

### The Reverse Solution

We solve for the original pixel value:

$$original = \frac{watermarked - \alpha \cdot logo}{1 - \alpha}$$

By calibrating the exact Alpha map from known outputs, we reconstruct the original pixels with zero loss.

### Detection

1. **Profile catalog lookup** — matches image dimensions to predict the current Gemini 3.5+ watermark profile first, then legacy when needed.
2. **NCC template matching** — Normalized Cross-Correlation search in the bottom-right region.
3. **Restoration validation** — confirms the detected watermark is real before applying removal (disable with `--adaptive off`).
4. **Confidence threshold** — only applies removal when detection confidence ≥ 50%.

### Gemini 3.5+ Profile Support

Starting with Gemini 3.5, Google shifted the visible image watermark position and changed the small alpha map. The default image pipeline now tries the current profile first; if detection skips, it retries the legacy profile before reporting that no watermark was found.

| CLI usage | First attempt | Fallback | Use case |
| --- | --- | --- | --- |
| `pictx remove image.png` | Current / V2 | Legacy / V1 | Default for mixed folders |
| `pictx remove image.png --legacy` | Legacy / V1 | — | Pre-Gemini 3.5 outputs |
| `pictx remove image.png --no-legacy` | Current / V2 | — | Strict Gemini 3.5+ only |
| `pictx remove image.png --legacy --no-legacy` | — | — | Conflict, exits 2 |

### Gemini 3.5+ Video Profile Support

Starting with Gemini 3.5, video outputs use the Gemini diamond logo in the bottom-right corner. Following upstream VeoWatermarkRemover v0.5.0, the JS video pipeline now uses diamond mode by default and keeps the older "Veo" text profile behind `--legacy`.

| CLI usage | Video profile | Use case |
| --- | --- | --- |
| `pictx remove video.mp4` | Diamond | Gemini 3.5+ videos, currently calibrated for 1080p landscape/portrait |
| `pictx remove old-video.mp4 --legacy` | Legacy "Veo" text | Pre-Gemini-3.5 Veo videos |
| `pictx remove video.mp4 --no-legacy` | Diamond | Same as the default for videos |

Exit codes:

| Code | Meaning |
| --- | --- |
| `0` | Processed successfully, or a video/batch run completed without real errors |
| `1` | Single image skipped because no watermark was detected on any tried profile |
| `2` | Real failure, such as bad args, conflicting flags, IO, decode, or encode error |

## Supported Formats

### Gemini Image Watermarks

| Condition | Watermark Size | Right Margin | Bottom Margin |
| --- | --- | --- | --- |
| Current / V2 large (>1024px on both axes) | 96×96 | 192px | 192px |
| Current / V2 small | 36×36 | Aspect-aware | Aspect-aware |
| Legacy / V1 large (>1024px on both axes) | 96×96 | 64px | 64px |
| Legacy / V1 small | 48×48 | 32px | 32px |

### Gemini 3.5 Diamond Video Watermarks

| Resolution | Orientation | Watermark Size | Status |
| --- | --- | --- | --- |
| 1920×1080 | Landscape | 96×96 px | ✅ |
| 1080×1920 | Portrait | 96×96 px | ✅ |
| 1280×720, 4K, square, other ratios | — | — | Not calibrated yet |

### Legacy Veo Text Video Watermarks

| Resolution | Orientation | Watermark Size | Status |
| --- | --- | --- | --- |
| 1280×720 | Landscape | 80×28 px | ✅ |
| 720×1280 | Portrait | 80×28 px | ✅ |
| 1920×1080 | Landscape | 120×42 px | ✅ |
| 1080×1920 | Portrait | 120×42 px | ✅ |

## Project Structure

```
gemini-veo-watermark-remover/
├── bin/                     # CLI entrypoint (pictx)
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
- Gemini 3.5 diamond video mode is limited to 1080p landscape and portrait until more samples are calibrated
- Browser video processing requires WebCodecs (Chrome 94+, Edge 94+)

<a id="skill"></a>

## Agent Skill

```bash
pnpm dlx skills add ACs-del/gemini-veo-watermark-remover --skill @pictx/pictx
node skills/gemini-veo-watermark-remover/scripts/run.mjs ./input.png ./clean.png
```

## Legal Disclaimer

This project is released under the MIT License. The removal of watermarks may have legal implications depending on your jurisdiction. Users are responsible for ensuring compliance with applicable laws.

## Credits

- Reverse Alpha Blending method based on [GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool) by Allen Kuo (MIT License)
- Gemini 3.5 image/video diamond profile follows [GeminiWatermarkTool v0.3.1](https://github.com/allenk/GeminiWatermarkTool/releases/tag/v0.3.1)
- Video profile behavior follows [VeoWatermarkRemover v0.5.0-demo](https://github.com/allenk/VeoWatermarkRemover/releases/tag/v0.5.0-demo)

## Related Links

- [Online Tool — removegeminiwatermark.io](https://removegeminiwatermark.io)
- [Pictx — AI image & video tools](https://pictx.ai)
- [GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool) — Original C/C++ implementation
- [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover) — Original Veo CLI
- [Reverse Alpha Blending Deep Dive](https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f)

## License

MIT
