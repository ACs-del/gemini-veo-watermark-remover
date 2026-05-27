# Test fixtures

Synthetic watermark samples are generated in-memory during tests (see `tests/imageProcessor.test.js`).

## Committed codec fixtures (`tests/fixtures/codec/`)

Tiny ffmpeg-generated H.264 MP4 clips (~2 KB each) used by `tests/codecDescription.test.js`. These stay in git so CI does not depend on downloading large Veo samples.

| File | Resolution | Purpose |
| --- | --- | --- |
| `h264-1920x1080.mp4` | 1920×1080 | avcC extraction smoke test |
| `h264-1280x720.mp4` | 1280×720 | avcC builder size parity test |

To add real regression fixtures:

1. Use anonymized Gemini exports only — no personal content.
2. Name image files `{profile}-{size}-{hash}.png` (e.g. `current-96-abc123.png`).
3. Name video files `{profile}-{width}x{height}-{slug}.mp4` (e.g. `diamond-1920x1080-gemini.mp4`, `legacy-1280x720-veo3-cat.mp4`).
4. Keep image sources in git; large video sources and processed outputs are gitignored (see repo `.gitignore`). README demo clips under `docs/demo/` are trimmed and committed separately.

## Video sample sources

| File | Resolution | Profile | Source |
| --- | --- | --- | --- |
| `diamond-1080-gemini.mp4` | 1920×1080 | diamond (default) | [GitHub issue attachment](https://github.com/user-attachments/assets/ae6d6755-005c-4b84-b21f-69ef6806f285) |
| `diamond-720-gemini.mp4` | 1280×720 | diamond (unsupported — 720p not calibrated) | [GitHub issue attachment](https://github.com/user-attachments/assets/5e37d2ff-503e-466e-ba54-de6c74c4f9b6) |
| `diamond-portrait-1080-gemini.mp4` | 1280×720* | diamond (unsupported at this size) | [GitHub issue attachment](https://github.com/user-attachments/assets/8eba900f-946f-43f2-9e7c-be9bea9c00a4) |
| `legacy-720-veo3-cat.mp4` | 1280×720 | legacy (`--legacy`) | [DeMark-World sample](https://raw.githubusercontent.com/linkedlist771/DeMark-World/main/resources/Veo3_Cat_Running_In_Forest_Video.mp4) |

\*Downloaded attachment is landscape 1280×720 despite the portrait label in upstream reports.

## Download fixtures

```bash
mkdir -p tests/fixtures/videos
cd tests/fixtures/videos

curl -L -o legacy-720-veo3-cat.mp4 \
  "https://raw.githubusercontent.com/linkedlist771/DeMark-World/main/resources/Veo3_Cat_Running_In_Forest_Video.mp4"

curl -L -o diamond-1080-gemini.mp4 \
  "https://github.com/user-attachments/assets/ae6d6755-005c-4b84-b21f-69ef6806f285"

curl -L -o diamond-720-gemini.mp4 \
  "https://github.com/user-attachments/assets/5e37d2ff-503e-466e-ba54-de6c74c4f9b6"

curl -L -o diamond-portrait-1080-gemini.mp4 \
  "https://github.com/user-attachments/assets/8eba900f-946f-43f2-9e7c-be9bea9c00a4"
```

## Process video fixtures locally

The published CLI routes Node.js video processing through `@ffmpeg/ffmpeg`, which currently fails with `ffmpeg.wasm does not support nodejs`. For local fixture generation, use system ffmpeg via:

```bash
# Gemini 3.5+ diamond (1080p landscape)
node scripts/process-video-native.mjs \
  tests/fixtures/videos/diamond-1080-gemini.mp4 \
  tests/fixtures/videos/fix/diamond-1080-gemini_clean.mp4

# Legacy "Veo" text (720p)
node scripts/process-video-native.mjs \
  tests/fixtures/videos/legacy-720-veo3-cat.mp4 \
  tests/fixtures/videos/fix/legacy-720-veo3-cat_clean.mp4 \
  --legacy
```

Clean outputs go under `tests/fixtures/videos/fix/` (gitignored). Trimmed README previews are regenerated into `docs/demo/` separately.
