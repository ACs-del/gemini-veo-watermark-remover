---
name: gemini-veo-watermark-remover
description: Remove visible Gemini image and Veo video watermarks locally using reverse alpha blending. Use when cleaning Gemini-generated images or Veo MP4 outputs without uploading files to a server.
---

# Gemini & Veo Watermark Remover

Local watermark removal for Gemini images and Veo videos using calibrated reverse alpha blending.

## When to use

- User asks to remove Gemini sparkle/diamond watermarks from images
- User asks to strip Veo video watermarks (1080p diamond or legacy text with `--legacy`)
- Batch-cleaning assets in a repo without cloud APIs

## Commands

### Image (PNG/JPEG/WebP)

```bash
node skills/gemini-veo-watermark-remover/scripts/run.mjs ./input.png ./clean.png
```

### Video (MP4)

```bash
node skills/gemini-veo-watermark-remover/scripts/run.mjs ./input.mp4 ./clean.mp4
```

### Legacy Veo text watermark

```bash
node skills/gemini-veo-watermark-remover/scripts/run.mjs ./old-veo.mp4 ./clean.mp4 --legacy
```

### JSON output (for automation)

```bash
node skills/gemini-veo-watermark-remover/scripts/run.mjs ./input.png ./clean.png --json
```

## Notes

- Only removes **visible** overlays; does not remove SynthID
- Diamond video mode supports 1920×1080 and 1080×1920
- Requires `npm install` in the package root (optional `sharp` for image I/O)
