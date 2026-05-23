# Gemini & Veo 去水印工具 — 本地无损水印移除

开源工具，用于移除 **Gemini 3.5+/旧版图片水印** 和 **Veo 视频水印**。核心采用可复现的 **反向 Alpha 混合** 算法，而不是不可控的 AI 修补，因此适合在浏览器、命令行、SDK、扩展和自动化流程中使用。

🆕 **支持 Gemini 3.5+** — 图片引擎默认优先检测当前 Gemini 水印 profile；如果未检测到，会自动回退到旧版 Gemini profile。

🚀 **想直接在线使用？** 现在可访问 [removegeminiwatermark.io](https://removegeminiwatermark.io)。Vylio 的完整 AI 图片/视频工具平台将上线于 [vylio.ai](https://vylio.ai)。

[English](README.md)

## 功能特性

- ✅ **Gemini + Veo** — 同时支持 Gemini 图片水印和 Veo 视频水印。
- ✅ **Gemini 3.5+ + 旧版** — 支持当前 36×36/96×96 Gemini profile，并自动回退旧版。
- ✅ **100% 本地处理** — 浏览器或本机处理，不上传文件。
- ✅ **数学精确** — 基于反向 Alpha 混合公式，而不是 AI 猜测。
- ✅ **自动检测** — 使用 NCC 模板匹配识别水印位置和尺寸。
- ✅ **多种使用方式** — 在线工具、Chrome 扩展、用户脚本、CLI、SDK、AI Agent Skill。
- ✅ **跨平台** — 支持现代浏览器和 Node.js 环境。

## 水印移除示例

| 原图 | 移除后 |
| --- | --- |
| ![Before](https://removegeminiwatermark.io/images/demo-before.webp) | ![After](https://removegeminiwatermark.io/images/demo-after.webp) |

## 如何移除水印

### 在线工具（推荐）

最快方式，适用于 Gemini 图片和 Veo 视频：

1. 打开 [removegeminiwatermark.io](https://removegeminiwatermark.io)。
2. 拖入 Gemini 图片或 Veo 视频。
3. 引擎会在浏览器本地自动处理并移除水印。
4. 下载干净文件。

### Chrome 扩展

在 Gemini 页面中自动处理生成图片：

1. 从 Chrome Web Store 安装（即将上线），或从 `src/extension/` 加载未打包扩展。
2. 打开 Gemini。
3. 预览、复制、下载动作都会返回清理后的图片。

### 用户脚本（Tampermonkey / Violentmonkey）

1. 安装 Tampermonkey 或 Violentmonkey。
2. 安装 `src/userscript/gemini-veo-watermark-remover.user.js`。
3. 打开 Gemini 对话页面。
4. 支持的图片会在页面中自动清理。

### 命令行

适合脚本、CI 和本地批处理：

```bash
# 使用 npx（零安装）
npx @vylio/gemini-veo-watermark-remover remove image.png
npx @vylio/gemini-veo-watermark-remover remove video.mp4

# 或全局安装
npm i -g @vylio/gemini-veo-watermark-remover
vwr remove image.png -o clean.png
vwr remove video.mp4 --verbose
vwr remove image.jpg --json
vwr remove old-gemini.png --legacy
vwr remove image.jpg --no-legacy
```

支持格式：

- **图片**：PNG、JPEG、WebP、BMP、TIFF（Gemini 水印）
- **视频**：MP4、WebM、MOV、AVI、MKV（Veo 水印）

### SDK 使用

```js
// 浏览器：移除 Gemini 图片水印
import { removeGeminiWatermark } from '@vylio/gemini-veo-watermark-remover/browser';

const { blob, detected, confidence } = await removeGeminiWatermark(file);
if (detected) {
  const url = URL.createObjectURL(blob);
  // 使用清理后的图片
}

// 浏览器：处理 Veo 视频
import { processVideoFile } from '@vylio/gemini-veo-watermark-remover/browser';

const cleanBlob = await processVideoFile(videoFile, {
  onProgress: (current, total) => console.log(`${current}/${total} frames`),
});

// Node.js：文件 API
import { processVideoFile } from '@vylio/gemini-veo-watermark-remover/node';
await processVideoFile('input.mp4', 'output.mp4');

// 轻量 Gemini-only 入口（不引入视频依赖）
import {
  processImage,
  createImageProcessor,
} from '@vylio/gemini-veo-watermark-remover/gemini';
```

### 无法移除你的水印？

本工具只针对 **Gemini 可见水印**（Logo / 星形叠加）和 **Veo 可见文字水印**。不可见 SynthID、隐写水印、任意第三方水印不在本工具目标范围内。

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
| `vwr remove image.png` | Current / V2 | Legacy / V1 | 混合文件夹默认选择 |
| `vwr remove image.png --legacy` | Legacy / V1 | — | 旧版 Gemini 输出 |
| `vwr remove image.png --no-legacy` | Current / V2 | — | 严格只处理 Gemini 3.5+ |
| `vwr remove image.png --legacy --no-legacy` | — | — | 参数冲突，退出码 2 |

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

### Veo 视频水印

| 分辨率 | 方向 | 水印尺寸 | 状态 |
| --- | --- | --- | --- |
| 1280×720 | 横屏 | 80×28 px | ✅ |
| 720×1280 | 竖屏 | 80×28 px | ✅ |
| 1920×1080 | 横屏 | 120×42 px | ✅ |
| 1080×1920 | 竖屏 | 120×42 px | ✅ |

## 项目结构

```text
gemini-veo-watermark-remover/
├── bin/                     # CLI 入口（vwr）
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
- Veo Alpha maps 仍是占位校准，欢迎贡献样本和精确 maps
- 视频处理依赖浏览器 WebCodecs 或 Node.js/ffmpeg.wasm 能力

## 法律声明

本项目基于 MIT 许可证发布。去除水印可能在不同司法管辖区产生法律影响，用户需自行确保符合适用法律、平台条款和知识产权要求。

## 致谢

- 反向 Alpha 混合方法基于 Allen Kuo 的 [GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool)（MIT License）
- Veo 视频处理灵感来自 [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover)

## 相关链接

- [在线工具 — removegeminiwatermark.io](https://removegeminiwatermark.io)
- [Vylio — AI 图片与视频工具](https://vylio.ai)
- [GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool)
- [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover)
- [Reverse Alpha Blending 技术解析](https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f)

## 许可证

[MIT License](LICENSE)
