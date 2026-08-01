

[中文文档](README_zh.md)

# Eliminador de Marcas de Agua de Gemini y Veo — Herramienta de Eliminación de Marcas de Agua de IA sin Pérdidas

Una herramienta de código abierto para **eliminar las marcas de agua de imágenes de Gemini y videos de Veo** de las salidas generadas por IA compatibles, con resultados de alta fidelidad y reproducibles. Construida con JavaScript puro, el motor utiliza un algoritmo matemáticamente exacto de **Mezcla Alfa Inversa** en lugar del relleno de IA impredecible.

🆕 **Compatibilidad con Gemini 3.5+** — las imágenes apuntan al perfil actual de Gemini por defecto con alternativa para versiones anteriores, y los videos ahora usan por defecto el perfil del logotipo de diamante de Gemini 3.5.

🚀 **¿Busca la `Herramienta en línea para eliminar marcas de agua de Gemini y Veo (Recomendada)`? Pruebe [removegeminiwatermark.io](https://removegeminiwatermark.io)** — gratuita, sin instalación, funciona directamente en su navegador.

💡 **¿Necesita eliminar otras marcas de agua de imágenes o videos?** Pruebe el eliminador de marcas de agua de IA de propósito general: [pictx.ai/image-watermark-remover](https://pictx.ai/image-watermark-remover)

<p align="center">
  <a href="https://removegeminiwatermark.io/"><img src="https://img.shields.io/badge/🛠️_Online_Tool-removegeminiwatermark.io-blue?style=for-the-badge" alt="Online Tool"></a>&nbsp;
  <a href="https://www.npmjs.com/package/@pictx/gemini-veo-watermark-remover"><img src="https://img.shields.io/badge/📦_npm-@pictx/gemini--veo--watermark--remover-CB3837?style=for-the-badge" alt="npm package"></a>&nbsp;
  <a href="https://removegeminiwatermark.io/userscript/gemini-veo-watermark-remover.user.js"><img src="https://img.shields.io/badge/🐒_Userscript-Install-green?style=for-the-badge" alt="Userscript"></a>&nbsp;
  <a href="https://pictx.ai/image-watermark-remover"><img src="https://img.shields.io/badge/🧹_General_Remover-pictx.ai-111111?style=for-the-badge" alt="General AI Watermark Remover"></a>
</p>

<p align="center">
  <img src="https://count.getloli.com/@gemini-veo-watermark-remover?name=gemini-veo-watermark-remover&theme=minecraft&padding=7&offset=0&align=top&scale=1&pixelated=1&darkmode=auto" width="400" alt="visitor counter">
</p>

## Características

- ✅ **Gemini + Veo** — Primera herramienta que maneja tanto marcas de agua de imágenes de Gemini como de videos de Veo
- ✅ **Gemini 3.5+ + Legacy** — Perfil actual de Gemini 36×36/96×96 con alternativa automática para versiones anteriores.
- ✅ **Logotipo de Diamante para Videos de Gemini 3.5** — El modo de video sigue a VeoWatermarkRemover v0.5.0: logotipo de diamante por defecto, texto antiguo "Veo" mediante `--legacy`.
- ✅ **Procesamiento 100% Local** — Todo el procesamiento ocurre localmente. No se sube nada.
- ✅ **Precisión Matemática** — Fórmula de Mezcla Alfa Inversa, no alucinación de IA.
- ✅ **Detección Automática** — La coincidencia de plantillas NCC identifica el tamaño y la posición de la marca de agua.
- ✅ **Uso Flexible** — Herramienta en línea, extensión de Chrome, userscript, CLI, SDK y Habilidad de Agente.
- ✅ **Multiplataforma** — Funciona en navegadores modernos y entornos Node.js.

## Soporte por Canal × Medio

No todos los canales de distribución manejan tanto **imágenes** de Gemini como **videos** de Veo. Use esta matriz para elegir la herramienta correcta:

| Canal | Imágenes de Gemini | Videos de Veo | Notas |
| --- | :---: | :---: | --- |
| npm `@pictx/gemini-veo-watermark-remover` | ✅ | ✅ | `.../browser`, `.../node`, `.../gemini` |
| CLI `pictx remove` | ✅ | ✅ | Carpetas por lotes con `--out-dir` |
| Habilidad de Agente | ✅ | ✅ | Envuelve la CLI |
| [removegeminiwatermark.io](https://removegeminiwatermark.io) | ✅ | ✅ | Canalización WebCodecs basada en carga |
| Extensión de Chrome | ✅ | ❌ | Solo imágenes de la página de Gemini; copiar + descargar limpiadas |
| Userscript | ✅ | ❌ | Solo imágenes de la página de Gemini |

Para videos de Veo desde el navegador, use la herramienta en línea o `npx pictx remove video.mp4`. La extensión y el userscript permanecen intencionalmente solo para imágenes porque se integran con las vistas previas de chat de Gemini, no con la decodificación completa de archivos de video.

## Ejemplos de Eliminación de Marcas de Agua

### Imágenes

| Imagen Original | Marca de Agua Eliminada |
| --- | --- |
| ![Before](https://removegeminiwatermark.io/images/demo-before.webp) | ![After](https://removegeminiwatermark.io/images/demo-after.webp) |

### Videos

Logotipo de diamante de Gemini 3.5+ (1920×1080, perfil por defecto):

| Antes | Después |
| --- | --- |
| <video src="docs/demo/video-diamond-1080-before.mp4" controls playsinline width="480"></video> | <video src="docs/demo/video-diamond-1080-after.mp4" controls playsinline width="480"></video> |

Marca de agua de texto `"Veo"` antigua (1280×720, `--legacy`):

| Antes | Después |
| --- | --- |
| <video src="docs/demo/video-legacy-720-before.mp4" controls playsinline width="320"></video> | <video src="docs/demo/video-legacy-720-after.mp4" controls playsinline width="320"></video> |

Las muestras en resolución completa y los pasos para regeneración local se encuentran en `tests/fixtures/videos/` (ver [tests/fixtures/README.md](tests/fixtures/README.md)). Para procesamiento basado en navegador sin instalar ffmpeg, use [removegeminiwatermark.io](https://removegeminiwatermark.io).

## Novedades

El motor de video se ha actualizado para seguir [VeoWatermarkRemover v0.5.0-demo](https://github.com/allenk/VeoWatermarkRemover/releases/tag/v0.5.0-demo). Las salidas de video de Gemini 3.5+ ahora usan el logotipo de diamante de Gemini en lugar de la antigua superposición de texto "Veo", por lo que `pictx remove video.mp4` apunta al perfil de diamante por defecto.

Los videos anteriores a Gemini 3.5 con la marca de agua de texto "Veo" deben procesarse con `--legacy`. No hay una alternativa automática entre perfiles de video porque las formas y posiciones difieren, y aplicar el perfil incorrecto puede dañar el fotograma.

## Cómo Eliminar Marcas de Agua

### Eliminador en Línea (Recomendado)

La forma más rápida y sencilla: funciona tanto para imágenes de Gemini como para videos de Veo:

1. Abra [removegeminiwatermark.io](https://removegeminiwatermark.io).
2. Arrastre y suelte su imagen de Gemini o video de Veo.
3. El motor procesará y eliminará automáticamente la marca de agua.
4. Descargue el archivo limpio.

### Extensión de Chrome (solo imágenes de Gemini)

Elimina automáticamente las marcas de agua de las **imágenes** generadas por Gemini en las páginas de Gemini (no videos de Veo):

1. Instale desde la Chrome Web Store (próximamente), cargue sin empaquetar desde `src/extension/`, o use el zip de GitHub Release.
2. Abra Gemini. La extensión procesa automáticamente las imágenes compatibles.
3. Las acciones de vista previa, copiar y descargar devuelven imágenes limpias.
4. Si la página se vuelve lenta, desactive la extensión desde el popup y actualice Gemini.

### Userscript (Tampermonkey / Violentmonkey — solo imágenes de Gemini)

1. Instale un gestor de userscripts (p. ej., Tampermonkey).
2. Instale `gemini-veo-watermark-remover.user.js` desde `src/userscript/` o [removegeminiwatermark.io/userscript/](https://removegeminiwatermark.io/userscript/gemini-veo-watermark-remover.user.js).
3. Navegue a las páginas de conversación de Gemini.
4. Las imágenes se limpian automáticamente in situ; los flujos nativos de copiar/descargar devuelven resultados limpios.

Para videos de Veo, use la [herramienta en línea](https://removegeminiwatermark.io) o la CLI en su lugar.

### CLI

Para scripting, CI y flujos de trabajo locales por lotes:

```bash
# Using npx (zero install)
npx @pictx/gemini-veo-watermark-remover remove image.png
npx @pictx/gemini-veo-watermark-remover remove video.mp4
npx @pictx/gemini-veo-watermark-remover remove old-veo-video.mp4 --legacy

# Or install globally (CLI command is still `pictx`)
npm i -g @pictx/gemini-veo-watermark-remover
pictx remove image.png -o clean.png
pictx remove video.mp4 --verbose              # Gemini 3.5+ diamond logo
pictx remove old-veo-video.mp4 --legacy       # old "Veo" text watermark
pictx remove image.jpg --json  # machine-readable output
pictx remove old-gemini.png --legacy
pictx remove image.jpg --no-legacy
```

Formatos compatibles:
- **Imágenes**: PNG, JPEG, WebP, BMP, TIFF (marca de agua de Gemini)
- **Videos**: MP4, WebM, MOV, AVI, MKV (marca de agua de Veo)

### Uso del SDK

```javascript
// Browser — remove Gemini watermark from image
import { removeGeminiWatermark } from '@pictx/gemini-veo-watermark-remover/browser';

const { blob, detected, confidence } = await removeGeminiWatermark(file);
if (detected) {
  const url = URL.createObjectURL(blob);
  // Use cleaned image...
}

// Browser — process Gemini 3.5+ diamond video
import { processVideoFile } from '@pictx/gemini-veo-watermark-remover/browser';

const cleanBlob = await processVideoFile(videoFile, {
  onProgress: (current, total) => console.log(`${current}/${total} frames`),
});

// Browser — process legacy "Veo" text videos
const legacyBlob = await processVideoFile(videoFile, { videoProfile: 'legacy' });

// Node.js — file-based API
import { processVideoFile } from '@pictx/gemini-veo-watermark-remover/node';
await processVideoFile('input.mp4', 'output.mp4');

// Gemini-only lightweight import (no video deps)
import { processImage, createImageProcessor } from '@pictx/gemini-veo-watermark-remover/gemini';
```

### ¿No puede eliminar su marca de agua?

Esta herramienta apunta a la **marca de agua visible de Gemini** (superposición de logotipo/estrella), **logotipos de diamante en videos de Gemini 3.5+** y **marcas de agua de texto visibles antiguas de Veo**. Para otros tipos de marcas de agua, pruebe nuestro eliminador de marcas de agua de IA de propósito general.

## Cómo Funciona

### El Proceso de Marca de Agua

Tanto Gemini como Veo aplican marcas de agua usando composición alfa estándar:

$$watermarked = \alpha \cdot logo + (1 - \alpha) \cdot original$$

### La Solución Inversa

Resolvemos para el valor de píxel original:

$$original = \frac{watermarked - \alpha \cdot logo}{1 - \alpha}$$

Al calibrar el mapa Alfa exacto a partir de salidas conocidas, reconstruimos los píxeles originales sin pérdida.

### Detección

1. **Búsqueda en catálogo de perfiles** — coincide las dimensiones de la imagen para predecir primero el perfil actual de Gemini 3.5+, luego legacy cuando sea necesario.
2. **Coincidencia de plantillas NCC** — Búsqueda de Correlación Cruzada Normalizada en la región inferior derecha.
3. **Validación de restauración** — confirma que la marca de agua detectada es real antes de aplicar la eliminación (desactive con `--adaptive off`).
4. **Umbral de confianza** — solo aplica la eliminación cuando la confianza de detección ≥ 50%.

### Soporte de Perfil Gemini 3.5+

A partir de Gemini 3.5, Google cambió la posición de la marca de agua visible de la imagen y modificó el pequeño mapa alfa. La canalización de imágenes por defecto ahora intenta el perfil actual primero; si la detección falla, reintentará el perfil legacy antes de informar que no se encontró marca de agua.

| Uso en CLI | Primer intento | Alternativa | Caso de uso |
| --- | --- | --- | --- |
| `pictx remove image.png` | Actual / V2 | Legacy / V1 | Predeterminado para carpetas mixtas |
| `pictx remove image.png --legacy` | Legacy / V1 | — | Salidas anteriores a Gemini 3.5 |
| `pictx remove image.png --no-legacy` | Actual / V2 | — | Estrictamente solo Gemini 3.5+ |
| `pictx remove image.png --legacy --no-legacy` | — | — | Conflicto, sale con código 2 |

### Soporte de Perfil de Video Gemini 3.5+

A partir de Gemini 3.5, las salidas de video usan el logotipo de diamante de Gemini en la esquina inferior derecha. Siguiendo a VeoWatermarkRemover v0.5.0, la canalización de video JS ahora usa el modo diamante por defecto y mantiene el perfil de texto antiguo "Veo" detrás de `--legacy`.

| Uso en CLI | Perfil de video | Caso de uso |
| --- | --- | --- |
| `pictx remove video.mp4` | Diamante | Videos de Gemini 3.5+, actualmente calibrado para 1080p horizontal/vertical |
| `pictx remove old-video.mp4 --legacy` | Legacy texto "Veo" | Videos de Veo anteriores a Gemini 3.5 |
| `pictx remove video.mp4 --no-legacy` | Diamante | Igual que el predeterminado para videos |

Códigos de salida:

| Código | Significado |
| --- | --- |
| `0` | Procesado correctamente, o una ejecución de video/por lotes se completó sin errores reales |
| `1` | Imagen única omitida porque no se detectó marca de agua en ningún perfil probado |
| `2` | Fallo real, como argumentos incorrectos, banderas conflictivas, E/S, decodificación o error de codificación |

## Formatos Compatibles

### Marcas de Agua de Imágenes de Gemini

| Condición | Tamaño de Marca de Agua | Margen Derecho | Margen Inferior |
| --- | --- | --- | --- |
| Actual / V2 grande (>1024px en ambos ejes) | 96×96 | 192px | 192px |
| Actual / V2 pequeño | 36×36 | Consciente del aspecto | Consciente del aspecto |
| Legacy / V1 grande (>1024px en ambos ejes) | 96×96 | 64px | 64px |
| Legacy / V1 pequeño | 48×48 | 32px | 32px |

### Marcas de Agua de Video de Diamante Gemini 3.5

| Resolución | Orientación | Tamaño de Marca de Agua | Estado |
| --- | --- | --- | --- |
| 1920×1080 | Horizontal | 96×96 px | ✅ |
| 1080×1920 | Vertical | 96×96 px | ✅ |
| 1280×720, 4K, cuadrado, otras proporciones | — | — | Aún no calibrado |

### Marcas de Agua de Texto Legacy Veo para Video

| Resolución | Orientación | Tamaño de Marca de Agua | Estado |
| --- | --- | --- | --- |
| 1280×720 | Horizontal | 80×28 px | ✅ |
| 720×1280 | Vertical | 80×28 px | ✅ |
| 1920×1080 | Horizontal | 120×42 px | ✅ |
| 1080×1920 | Vertical | 120×42 px | ✅ |

## Estructura del Proyecto

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

## Desarrollo

```bash
# Install dependencies
npm install

# Build all bundles
node build.js

# Watch mode
node build.js --watch
```

## Limitaciones

- Solo elimina marcas de agua **visibles** de Gemini/Veo (superposición de logotipo, marca de agua de texto)
- **No** elimina marcas de agua invisibles de SynthID ni esteganográficas
- El modo de video de diamante de Gemini 3.5 está limitado a 1080p horizontal y vertical hasta que se calibren más muestras
- El procesamiento de video en el navegador requiere WebCodecs (Chrome 94+, Edge 94+)

<a id="skill"></a>

## Habilidad de Agente

```bash
pnpm dlx skills add ACs-del/gemini-veo-watermark-remover --skill @pictx/gemini-veo-watermark-remover
node skills/gemini-veo-watermark-remover/scripts/run.mjs ./input.png ./clean.png
```

## Descargo de Responsabilidad Legal

Este proyecto se publica bajo la Licencia MIT. La eliminación de marcas de agua puede tener implicaciones legales dependiendo de su jurisdicción. Los usuarios son responsables de garantizar el cumplimiento de las leyes aplicables.

## Créditos

- Método de Mezcla Alfa Inversa basado en [GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool) de Allen Kuo (Licencia MIT)
- El perfil de imagen/video de diamante de Gemini 3.5 sigue a [GeminiWatermarkTool v0.3.1](https://github.com/allenk/GeminiWatermarkTool/releases/tag/v0.3.1)
- El comportamiento del perfil de video sigue a [VeoWatermarkRemover v0.5.0-demo](https://github.com/allenk/VeoWatermarkRemover/releases/tag/v0.5.0-demo)

## Enlaces Relacionados

- [Herramienta en Línea — removegeminiwatermark.io](https://removegeminiwatermark.io)
- [Pictx — Herramientas de imágenes y videos de IA](https://pictx.ai)
- [GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool) — Implementación original en C/C++
- [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover) — CLI original de Veo
- [Análisis Profundo de la Mezcla Alfa Inversa](https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f)

## Licencia

MIT
