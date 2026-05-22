# Gemini Veo 视频去水印工具

精准去除 Google Veo 视频水印，像素级还原。纯 JavaScript 实现，浏览器或 Node.js 本地运行 — 无需服务器，无 AI 猜测。

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 工作原理

通过反向 Alpha 混合算法，利用预校准的 alpha map 还原 "Veo" 水印下的原始像素：

```
original = (watermarked - α × 255) / (1 - α)
```

每一帧都通过数学公式精确还原 — 无神经网络、无模糊边缘、无画质损失。

## 功能特性

- **像素级精确还原** — 针对 720p 和 1080p（横屏/竖屏）校准的 alpha map
- **双视频后端** — WebCodecs API（浏览器，硬件加速）+ ffmpeg.wasm（Node.js / 降级方案）
- **音频直通** — 音频轨道原样保留，不重新编码
- **CLI 命令行工具** — `vwr remove video.mp4`，适合批处理和 CI 流程
- **浏览器 SDK** — 在浏览器中完成全部处理，零上传
- **轻量级** — 核心算法约 2KB，无重型 ML 模型

## 快速开始

### 在线使用（即将上线）

访问 [removegeminiwatermark.io](https://removegeminiwatermark.io) 在浏览器中处理视频。

### 命令行

```bash
npx gemini-veo-watermark-remover remove input.mp4 -o output.mp4
```

或全局安装：

```bash
npm i -g gemini-veo-watermark-remover
vwr remove input.mp4
```

### 编程调用（Node.js）

```js
import { processVideoFile } from 'gemini-veo-watermark-remover/node';

await processVideoFile('input.mp4', 'output.mp4', {
  onProgress: (current, total) => console.log(`${current}/${total} frames`)
});
```

### 编程调用（浏览器）

```js
import { processVideoFile } from 'gemini-veo-watermark-remover/browser';

const blob = await processVideoFile(file, {
  onProgress: (current, total) => updateProgressBar(current / total)
});

// 下载结果
const url = URL.createObjectURL(blob);
```

## 支持的分辨率

| 分辨率 | 方向 | 状态 |
|--------|------|------|
| 1280×720 | 横屏 | ✅ |
| 720×1280 | 竖屏 | ✅ |
| 1920×1080 | 横屏 | ✅ |
| 1080×1920 | 竖屏 | ✅ |

## 项目结构

```
src/
├── core/           # 反向 Alpha 混合 + 水印配置
├── video/          # 解码/编码管线（WebCodecs + ffmpeg.wasm）
├── sdk/            # 入口文件（index, browser, node）
└── cli/            # 命令行实现
bin/
└── vwr.mjs         # CLI 入口
```

## 开发

```bash
npm install
node build.js        # 构建所有 bundle
node build.js --watch
```

## 与 AI 去水印工具的区别

| | 本工具 | AI 修复（inpainting） |
|---|---|---|
| 方法 | 数学公式（确定性） | 神经网络（概率性） |
| 质量 | 对已知 Veo 水印像素级精确 | 近似结果，可能模糊或产生幻觉 |
| 速度 | 每帧实时处理 | 每帧需要数秒 |
| 适用范围 | 仅 Veo 水印 | 任意水印（但精度低） |
| 隐私 | 100% 本地处理 | 通常需要上传到服务器 |

## 贡献

1. Fork 并 clone
2. `npm install && node build.js`
3. 在 `src/` 中修改
4. 提交 PR

**征集 Alpha Map 校准帮助** — 如果你有 Veo 视频样本，我们需要帧差分数据来改进水印 map。详见 [Issues](https://github.com/ACs-del/gemini-veo-watermark-remover/issues)。

## 许可证

[MIT](LICENSE) © ACs-del
