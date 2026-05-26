# Test fixtures

Synthetic watermark samples are generated in-memory during tests (see `tests/imageProcessor.test.js`).

To add real regression fixtures:

1. Use anonymized Gemini exports only — no personal content.
2. Name files `{profile}-{size}-{hash}.png` (e.g. `current-96-abc123.png`).
3. Keep sources in git; optional snapshot outputs under `fix/` are gitignored.
