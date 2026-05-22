# Veo 视频去水印工具 — 无损视频水印移除

开源工具，精准去除 Google Veo AI 生成视频中的水印，像素级还原。纯 JavaScript 实现，使用数学精确的反向 Alpha 混合算法，而非不可预测的 AI 修复。

> 🚀 想用`在线 Veo 去水印工具`？试试 [removegeminiwatermark.io](https://removegeminiwatermark.io/) — 免费、无需安装，浏览器中直接处理。

[在线工具](https://removegeminiwatermark.io/)  [命令行](#命令行)  [浏览器 SDK](#编程调用浏览器)  [Node.js SDK](#编程调用nodejs)

[English](README.md)

---

## 功能特性

- ✅ **100% 本地处理** — 所有视频处理在浏览器或本地机器完成，不上传任何数据
- ✅ **数学精确** — 基于反向 Alpha 混合公式，而非"幻觉式" AI 模型
- ✅ **逐帧还原** — 每一帧独立处理，像素级精确
- ✅ **音频直通** — 音频轨道原样保留，不重新编码
- ✅ **双视频后端** — WebCodecs API（浏览器，硬件加速）+ ffmpeg.wasm（Node.js / 降级方案）
- ✅ **灵活使用** — 在线工具快速处理、CLI 批处理自动化、SDK 集成开发
- ✅ **跨平台** — 支持现代浏览器（Chrome 94+、Edge 94+）和 Node.js 环境

## ⚠️ 免责声明

> **使用风险自负**
>
> 本工具会修改视频文件。虽然设计上力求可靠，但以下情况可能导致意外结果：
> - Veo 水印实现的变化
> - 损坏或异常的视频格式
> - 测试未覆盖的边缘情况
>
> 作者不对任何数据丢失、视频损坏或非预期修改承担责任。

## 如何去除 Veo 水印

### 在线 Veo 去水印（推荐）

最快捷的方式：

1. 打开 [removegeminiwatermark.io](https://removegeminiwatermark.io/)
2. 拖拽或点击选择 Veo 生成的视频
3. 引擎自动逐帧处理并移除水印
4. 下载清洁视频

### 命令行

适用于脚本、CI 和批处理：

```bash
# 使用 npx（零安装）
npx gemini-veo-watermark-remover remove input.mp4 -o output.mp4

# 或全局安装
npm i -g gemini-veo-watermark-remover
vwr remove input.mp4
vwr remove input.mp4 --output clean.mp4 --overwrite
vwr remove input.mp4 --json  # 机器可读输出
```

### 编程调用（Node.js）

```js
import { processVideoFile } from 'gemini-veo-watermark-remover/node';

await processVideoFile('input.mp4', 'output.mp4', {
  onProgress: (current, total) => {
    console.log(`处理中: ${current}/${total} 帧`);
  }
});
```

### 编程调用（浏览器）

```js
import { processVideoFile } from 'gemini-veo-watermark-remover/browser';

const blob = await processVideoFile(file, {
  onProgress: (current, total) => {
    updateProgressBar(current / total);
  }
});

// 触发下载
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'output.mp4';
a.click();
```

### 无法去除你的水印？

本工具仅针对 Veo 的可见水印（右下角半透明 "Veo" 文字）。如果你的视频水印不匹配已知 Veo 格式，或需要移除其他类型的水印，可能需要通用 AI 视频去水印工具。

## 开发

```bash
# 安装依赖
npm install

# 构建所有 bundle
node build.js

# 监听模式
node build.js --watch
```

## SDK 使用

包提供多个入口：

```js
// 通用（自动检测环境）
import { processVideo, createFrameProcessor } from 'gemini-veo-watermark-remover';

// 浏览器专用（优先 WebCodecs）
import { processVideoFile } from 'gemini-veo-watermark-remover/browser';

// Node.js 专用（文件系统 API）
import { processVideoFile } from 'gemini-veo-watermark-remover/node';
```

高级用法：

```js
import {
  removeWatermark,
  createFrameProcessor,
  getVeoWatermarkInfo,
  registerAlphaMap,
} from 'gemini-veo-watermark-remover';

// 处理单帧
const processor = createFrameProcessor(1920, 1080);
const result = processor.process(imageData);
console.log(result.processed); // true
```

## Veo 水印去除原理

### Veo 的水印添加过程

Veo 使用标准 Alpha 合成添加水印：

```
watermarked = α · logo + (1 - α) · original
```

其中：
- `watermarked`：带水印的像素值
- `α`：Alpha 通道值（0.0 – 1.0）
- `logo`：水印颜色值（白色 = 255）
- `original`：我们要恢复的原始像素值

### 反向求解

去水印时，求解 `original`：

```
original = (watermarked - α · logo) / (1 - α)
```

通过对已知 Veo 视频输出校准精确的 Alpha map，我们可以零损失地还原原始像素 — 应用于视频的每一帧。

## 支持的分辨率

| 分辨率 | 方向 | 水印尺寸 | 状态 |
|--------|------|----------|------|
| 1280×720 | 横屏 | 80×28 px | ✅ |
| 720×1280 | 竖屏 | 80×28 px | ✅ |
| 1920×1080 | 横屏 | 120×42 px | ✅ |
| 1080×1920 | 竖屏 | 120×42 px | ✅ |

## 项目结构

```
gemini-veo-watermark-remover/
├── bin/
│   └── vwr.mjs              # CLI 入口
├── src/
│   ├── core/
│   │   ├── blendModes.js        # 反向 Alpha 混合算法
│   │   ├── veoConfig.js         # 水印位置目录
│   │   ├── embeddedAlphaMaps.js # 预校准 Alpha maps
│   │   └── frameProcessor.js    # 逐帧处理协调器
│   ├── video/
│   │   ├── videoDecoder.js      # 解码抽象层（WebCodecs + ffmpeg.wasm）
│   │   ├── videoEncoder.js      # 编码抽象层（mp4-muxer + ffmpeg.wasm）
│   │   └── pipeline.js          # 完整 解码→处理→编码 管线
│   ├── sdk/
│   │   ├── index.js             # 通用入口
│   │   ├── browser.js           # 浏览器优化 API
│   │   └── node.js              # Node.js 文件系统 API
│   └── cli/
│       └── vwrCli.js            # CLI 参数解析与执行
├── dist/                         # 构建输出
├── build.js                      # esbuild 构建脚本
└── package.json
```

## 架构概览

- `src/core/` 包含反向 Alpha 去除数学、水印位置检测和 Alpha map 管理
- `src/video/` 实现双后端视频解码/编码管线（浏览器用 WebCodecs，Node.js 用 ffmpeg.wasm）
- `src/sdk/` 提供通用、浏览器和 Node.js 的公共 API
- `src/cli/` 和 `bin/vwr.mjs` 提供面向文件的本地自动化

## 运行要求

### 浏览器
- Chrome 94+ / Edge 94+（WebCodecs API）
- ES modules、Canvas API、TypedArray（`Float32Array`、`Uint8ClampedArray`）

### Node.js / CLI
- Node.js 18+
- ffmpeg.wasm 运行时（首次使用下载约 25MB WASM 文件）

## 限制

- 仅去除 Veo 可见水印（右下角半透明 "Veo" 文字）
- 不去除不可见/隐写水印（如 SynthID）
- 针对 Veo 当前可见水印模式设计
- Alpha maps 为占位符 — 完整校准需要 Veo 视频样本（欢迎贡献）
- 视频处理速度：浏览器中约 2-5 倍实时，ffmpeg.wasm 较慢

## 法律声明

本项目基于 MIT 许可证发布。

去除水印可能在不同司法管辖区有法律影响。用户需自行确保使用本工具符合适用法律、服务条款和知识产权。

作者不鼓励将本工具用于版权侵权、虚假陈述或任何其他非法目的。

本软件"按原样"提供，不作任何明示或暗示的保证。作者不对因使用本软件而产生的任何索赔、损害或其他责任承担责任。

## 致谢

本项目是 [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover) 的 JavaScript 移植版本，原作者为 Allen Kuo ([@allenk](https://github.com/allenk))。

反向 Alpha 混合方法和校准水印方案基于原始工作 © 2024 AllenK (Kwyshell)，MIT 许可证授权。

## 相关链接

- [VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover) — Allen Kuo 的原始 C++ 实现
- [Removing Gemini AI Watermarks: A Deep Dive into Reverse Alpha Blending](https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f) — 原作者的技术深度解析
- [GargantuaX/gemini-watermark-remover](https://github.com/GargantuaX/gemini-watermark-remover) — 姊妹项目：Gemini 图片去水印

## 许可证

[MIT License](LICENSE)
