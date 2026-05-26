# Release checklist

## Pre-release

1. Update `CHANGELOG.md` and bump `package.json` version.
2. Run `npm test` and `npm run build`.
3. Verify CLI: `node bin/pictx.mjs remove --help`
4. Package extension: `npm run package:extension`

## Publish npm

```bash
npm run build
npm publish --access public
```

Requires npm login and an `@pictx` org (or user scope) with permission to publish `@pictx/gemini-veo-watermark-remover`.

## GitHub Release

1. Create tag `vX.Y.Z`.
2. Attach `dist/pictx-extension-vX.Y.Z.zip` from `npm run package:extension`.
3. Paste changelog section for the version.

## Chrome Web Store

1. Upload the same extension zip.
2. Privacy: no data collected; local image processing only.
3. Permissions: `activeTab`, `storage`, host access to `gemini.google.com` and `aistudio.google.com`.
