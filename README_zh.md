[English](README.md)

> 🔥 厌倦了 Gemini 和 Veo 水印？试试更强大的 **GPT Image 2**：[pictx.ai](https://pictx.ai) — 限时免费。

# Gemini & Veo 去水印工具 — 无损去除 AI 图片与视频水印

开源的 Gemini/Veo 水印去除工具，在已支持的 Gemini 导出图片和 Veo 导出视频上可提供高保真、可复现的去水印结果。基于纯 JavaScript 实现，使用数学精确的 **反向 Alpha 混合** 算法，而非 AI 修复。

🆕 **支持 Gemini 3.5+** — 图片引擎默认优先检测当前 Gemini 水印 profile；视频引擎默认处理 Gemini 3.5 的 diamond logo。

🚀 **想快速去除 Gemini/Veo 水印？** 直接使用在线 Gemini & Veo 去水印工具：[removegeminiwatermark.io](https://removegeminiwatermark.io) — 免费、无需安装，浏览器即可使用。

💡 **需要去除其他图片或视频水印？** 试试通用 AI 去水印工具：[pictx.ai/image-watermark-remover](https://pictx.ai/image-watermark-remover)

<p align="center">
  <a href="https://removegeminiwatermark.io/"><img src="https://img.shields.io/badge/🛠️_在线工具-removegeminiwatermark.io-blue?style=for-the-badge" alt="在线工具"></a>&nbsp;
  <a href="https://www.npmjs.com/package/@pictx/gemini-veo-watermark-remover"><img src="https://img.shields.io/badge/📦_npm-@pictx/gemini--veo--watermark--remover-CB3837?style=for-the-badge" alt="npm package"></a>&nbsp;
  <a href="https://removegeminiwatermark.io/userscript/gemini-veo-watermark-remover.user.js"><img src="https://img.shields.io/badge/🐒_用户脚本-安装-green?style=for-the-badge" alt="用户脚本"></a>&nbsp;
  <a href="https://pictx.ai/image-watermark-remover"><img src="https://img.shields.io/badge/🧹_通用去水印-pictx.ai-111111?style=for-the-badge" alt="通用 AI 去水印"></a>
</p>

<p align="center">
  <img src="https://count.getloli.com/@gemini-veo-watermark-remover?name=gemini-veo-watermark-remover&theme=minecraft&padding=7&offset=0&align=top&scale=1&pixelated=1&darkmode=auto" width="400" alt="访问计数">
</p>

## 功能特性

- ✅ **Gemini + Veo** — 同时支持 Gemini 图片水印和 Veo 视频水印。
- ✅ **Gemini 3.5+ + 旧版** — 支持当前 36×36/96×96 Gemini profile，并自动回退旧版。
- ✅ **Gemini 3.5 视频 diamond** — 对齐上游 VeoWatermarkRemover v0.5.0：默认处理 diamond logo，旧 `"Veo"` 文字用 `--legacy`。
- ✅ **100% 本地处理** — 浏览器或本机处理，不上传文件。
- ✅ **数学精确** — 基于反向 Alpha 混合公式，而不是 AI 猜测。
- ✅ **自动检测** — 使用 NCC 模板匹配识别水印位置和尺寸。
- ✅ **多种使用方式** — 在线工具、Chrome 扩展、用户脚本、CLI、SDK、AI Agent Skill。
- ✅ **跨平台** — 支持现代浏览器和 Node.js 环境。

## 渠道 × 媒体类型支持

并非每个渠道都同时支持 Gemini **图片**与 Veo **视频**：

| 渠道 | Gemini 图片 | Veo 视频 | 说明 |
| --- | :---: | :---: | --- |
| npm `@pictx/gemini-veo-watermark-remover` | ✅ | ✅ | `.../browser`、`.../node`、`.../gemini` |
| CLI `pictx remove` | ✅ | ✅ | 目录批处理 `--out-dir` |
| Agent Skill | ✅ | ✅ | 包装 CLI |
| [removegeminiwatermark.io](https://removegeminiwatermark.io) | ✅ | ✅ | 浏览器上传 + WebCodecs |
| Chrome 扩展 | ✅ | ❌ | 仅 Gemini 页面图片 |
| 油猴脚本 | ✅ | ❌ | 仅 Gemini 页面图片 |

Veo 视频请用在线工具或 `npx pictx remove video.mp4`。扩展与油猴面向聊天预览集成，不做整文件视频解码。

## 水印移除示例

| 原图 | 移除后 |
| --- | --- |
| ![Before](https://removegeminiwatermark.io/images/demo-before.webp) | ![After](https://removegeminiwatermark.io/images/demo-after.webp) |

## 最新变化

视频引擎已对齐 [VeoWatermarkRemover v0.5.0-demo](https://github.com/allenk/VeoWatermarkRemover/releases/tag/v0.5.0-demo)。Gemini 3.5+ 视频输出现在使用右下角 Gemini diamond logo，而不是旧版 `"Veo"` 文字，因此 `pictx remove video.mp4` 默认处理 diamond profile。

旧的 pre-Gemini-3.5 `"Veo"` 文字水印视频需要显式加 `--legacy`。视频 profile 之间不会自动 fallback，因为两者形状和位置不同，错误套用会破坏画面。

## 如何移除水印

### 在线工具（推荐）

最快方式，适用于 Gemini 图片和 Veo 视频：

1. 打开 [removegeminiwatermark.io](https://removegeminiwatermark.io)。
2. 拖入 Gemini 图片或 Veo 视频。
3. 引擎会在浏览器本地自动处理并移除水印。
4. 下载干净文件。

### Chrome 扩展（仅 Gemini 图片）

在 Gemini 页面自动处理生成**图片**（不支持 Veo 视频）：

1. 从 Chrome Web Store 安装（即将上线）、加载 `src/extension/`，或使用 GitHub Release zip。
2. 打开 Gemini，扩展自动处理支持的图片。
3. 预览、复制、下载均返回清理后的图片。
4. 若页面变慢，可在 popup 中关闭开关并刷新 Gemini。

### 用户脚本（Tampermonkey — 仅 Gemini 图片）

1. 安装 Tampermonkey 或 Violentmonkey。
2. 安装 `src/userscript/gemini-veo-watermark-remover.user.js` 或 [在线托管版本](https://removegeminiwatermark.io/userscript/gemini-veo-watermark-remover.user.js)。
3. 打开 Gemini 对话页面，图片自动清理；原生复制/下载返回清理结果。

Veo 视频请使用[在线工具](https://removegeminiwatermark.io)或 CLI。

### 命令行

适合脚本、CI 和本地批处理：

```bash
# 使用 npx（零安装）
npx @pictx/gemini-veo-watermark-remover remove image.png
npx @pictx/gemini-veo-watermark-remover remove video.mp4
npx @pictx/gemini-veo-watermark-remover remove old-veo-video.mp4 --legacy

# 或全局安装（CLI 短命令仍为 pictx）
npm i -g @pictx/gemini-veo-watermark-remover
pictx remove image.png -o clean.png
pictx remove video.mp4 --verbose              # Gemini 3.5+ diamond logo
pictx remove old-veo-video.mp4 --legacy       # 旧版 "Veo" 文字水印
pictx remove image.jpg --json
pictx remove old-gemini.png --legacy
pictx remove image.jpg --no-legacy
```

支持格式：

- **图片**：PNG、JPEG、WebP、BMP、TIFF（Gemini 水印）
- **视频**：MP4、WebM、MOV、AVI、MKV（Veo 水印）

### SDK 使用

```js
// 浏览器：移除 Gemini 图片水印
import { removeGeminiWatermark } from '@pictx/gemini-veo-watermark-remover/browser';

const { blob, detected, confidence } = await removeGeminiWatermark(file);
if (detected) {
  const url = URL.createObjectURL(blob);
  // 使用清理后的图片
}

// 浏览器：处理 Gemini 3.5+ diamond 视频
import { processVideoFile } from '@pictx/gemini-veo-watermark-remover/browser';

const cleanBlob = await processVideoFile(videoFile, {
  onProgress: (current, total) => console.log(`${current}/${total} frames`),
});

// 浏览器：处理旧版 "Veo" 文字水印视频
const legacyBlob = await processVideoFile(videoFile, { videoProfile: 'legacy' });

// Node.js：文件 API
import { processVideoFile } from '@pictx/gemini-veo-watermark-remover/node';
await processVideoFile('input.mp4', 'output.mp4');

// 轻量 Gemini-only 入口（不引入视频依赖）
import {
  processImage,
  createImageProcessor,
} from '@pictx/gemini-veo-watermark-remover/gemini';
```

### 无法移除你的水印？

本工具只针对 **Gemini 可见水印**（Logo / 星形叠加）、**Gemini 3.5+ 视频 diamond logo** 和 **旧版 Veo 可见文字水印**。不可见 SynthID、隐写水印、任意第三方水印不在本工具目标范围内。

## 工作原理

Gemini 和 Veo 的可见水印都可理解为标准 Alpha 合成：

```text
watermarked = alpha * logo + (1 - alpha) * original
```

反向求解原始像素：

```text
original = (watermarked - alpha * logo) / (1 - alpha)
```

通过校准水印 Alpha map，并在右下角候选区域进行检测，可以重建被可见水印覆盖的像素。

### 检测流程

1. **Profile 目录查找** — 根据尺寸优先预测 Gemini 3.5+ 当前 profile，必要时回退旧版。
2. **NCC 模板匹配** — 在右下角区域进行归一化互相关搜索。
3. **置信度阈值** — 仅当检测置信度 ≥ 50% 时执行移除。

### Gemini 3.5+ Profile 支持

从 Gemini 3.5 开始，Google 调整了可见图片水印的位置和小尺寸 Alpha map。本工具默认先尝试当前 profile；如果未命中，再尝试旧版 profile。

| CLI 用法 | 首次尝试 | 回退 | 使用场景 |
| --- | --- | --- | --- |
| `pictx remove image.png` | Current / V2 | Legacy / V1 | 混合文件夹默认选择 |
| `pictx remove image.png --legacy` | Legacy / V1 | — | 旧版 Gemini 输出 |
| `pictx remove image.png --no-legacy` | Current / V2 | — | 严格只处理 Gemini 3.5+ |
| `pictx remove image.png --legacy --no-legacy` | — | — | 参数冲突，退出码 2 |

### Gemini 3.5+ 视频 Profile 支持

从 Gemini 3.5 开始，视频输出使用右下角 Gemini diamond logo。按照上游 VeoWatermarkRemover v0.5.0，本 JS 版视频管线默认使用 diamond mode，旧 `"Veo"` 文字 profile 保留在 `--legacy` 后面。

| CLI 用法 | 视频 profile | 使用场景 |
| --- | --- | --- |
| `pictx remove video.mp4` | Diamond | Gemini 3.5+ 视频，目前只校准 1080p 横屏/竖屏 |
| `pictx remove old-video.mp4 --legacy` | 旧版 `"Veo"` 文字 | pre-Gemini-3.5 Veo 视频 |
| `pictx remove video.mp4 --no-legacy` | Diamond | 对视频等同默认行为 |

退出码：

| 代码 | 含义 |
| --- | --- |
| `0` | 成功处理，或视频/批量任务完成且没有真实错误 |
| `1` | 单张图片未检测到任何支持的水印 |
| `2` | 参数冲突、IO、解码、编码等真实失败 |

## 支持格式

### Gemini 图片水印

| 条件 | 水印尺寸 | 右边距 | 下边距 |
| --- | --- | --- | --- |
| Current / V2 large（双轴 >1024px） | 96×96 | 192px | 192px |
| Current / V2 small | 36×36 | 根据比例计算 | 根据比例计算 |
| Legacy / V1 large（双轴 >1024px） | 96×96 | 64px | 64px |
| Legacy / V1 small | 48×48 | 32px | 32px |

### Gemini 3.5 Diamond 视频水印

| 分辨率 | 方向 | 水印尺寸 | 状态 |
| --- | --- | --- | --- |
| 1920×1080 | 横屏 | 96×96 px | ✅ |
| 1080×1920 | 竖屏 | 96×96 px | ✅ |
| 1280×720、4K、方形、其他比例 | — | — | 尚未校准 |

### 旧版 Veo 文字视频水印

| 分辨率 | 方向 | 水印尺寸 | 状态 |
| --- | --- | --- | --- |
| 1280×720 | 横屏 | 80×28 px | ✅ |
| 720×1280 | 竖屏 | 80×28 px | ✅ |
| 1920×1080 | 横屏 | 120×42 px | ✅ |
| 1080×1920 | 竖屏 | 120×42 px | ✅ |

## 项目结构

```text
gemini-veo-watermark-remover/
├── bin/                     # CLI 入口（pictx）
├── src/
│   ├── core/
│   │   ├── blendModes.js        # 共享反向 Alpha 混合算法
│   │   ├── veoConfig.js         # Veo 水印位置目录
│   │   ├── embeddedAlphaMaps.js # Veo Alpha map 注册表
│   │   ├── frameProcessor.js    # 视频逐帧处理
│   │   └── gemini/              # Gemini 图片水印模块
│   ├── video/                   # 视频解码/编码管线
│   ├── sdk/                     # 通用、浏览器、Node.js SDK 入口
│   ├── cli/                     # CLI 实现
│   ├── extension/               # Chrome Extension
│   └── userscript/              # Tampermonkey 用户脚本
├── dist/                        # 构建输出
├── build.js                     # esbuild 构建脚本
└── package.json
```

## 开发

```bash
npm install
node build.js
node build.js --watch
```

## 限制

- 仅移除 **可见** Gemini/Veo 水印（Logo 叠加、文字水印）
- 不移除不可见 SynthID 或隐写水印
- Gemini 3.5 diamond 视频模式当前仅支持 1080p 横屏和竖屏
- 视频处理依赖浏览器 WebCodecs 或 Node.js/ffmpeg.wasm 能力

<a id="skill"></a>

## Agent Skill

```bash
pnpm dlx skills add ACs-del/gemini-veo-watermark-remover --skill @pictx/gemini-veo-watermark-remover
node skills/gemini-veo-watermark-remover/scripts/run.mjs ./input.png ./clean.png
```

## 法律声明

本项目基于 MIT 许可证发布。去除水印可能在不同司法管辖区产生法律影响，用户需自行确保符合适用法律、平台条款和知识产权要求。

## 致谢

- 反向 Alpha 混合方法基于 Allen Kuo 的 [GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool)（MIT License）
- Gemini 3.5 图片/视频 diamond profile 对齐 [GeminiWatermarkTool v0.3.1](https://github.com/allenk/GeminiWatermarkTool/releases/tag/v0.3.1)
- 视频 profile 行为对齐 [VeoWatermarkRemover v0.5.0-demo](https://github.com/allenk/VeoWatermarkRemover/releases/tag/v0.5.0-demo)

## 相关链接

- [在线工具 — removegeminiwatermark.io](https://removegeminiwatermark.io)
- [Pictx — AI 图片与视频工具](https://pictx.ai)
- [GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool)
- [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover)
- [Reverse Alpha Blending 技术解析](https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f)

## 许可证

[MIT License](LICENSE)
