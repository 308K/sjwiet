# Sjwiet

[![License: MPL-2.0](https://img.shields.io/github/license/308K/sjwiet?style=flat)](https://www.mozilla.org/MPL/2.0/)
[![Build](https://github.com/308K/sjwiet/actions/workflows/ci.yml/badge.svg)](https://github.com/308K/sjwiet/actions/workflows/ci.yml)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)

实时时频谱、音高（基频）、共振峰（Formant）与音强分析的浏览器端声音训练工具，帮助你在练习发声、塑形声音时「看见」自己的声学参数。所有音频都在本地处理，**不会上传到任何服务器**。

> Real-time spectrogram, pitch, formant and intensity analysis to help you hear and shape your voice with intention. Everything runs locally — your audio never leaves your device.

---

## 功能特性

- **实时时频谱（Spectrogram）**——时间 × 频率 × 能量的滚动视图，可叠加音高 / F1 / F2 / 音强曲线，一键全屏查看。
- **声学指标面板**——实时显示音高（f0）、共振峰 F1/F2/F3、RMS 音强（dB），并标注是否落在目标区间。
- **音高曲线**——最近 30 秒的音高轨迹，叠加目标区间，直观看到发声的稳定性。
- **练习目标设定**——自定义音高上下限、F1/F2 目标与容差（Hz）；内置「女性化 / 男性化 / 中性」参考预设。
- **练习反馈**——根据声学参数给出的实时提示（音高偏低/偏高、共鸣位置、音量建议），以及「稳定度评分」（最近发声落在目标区间内的比例）。
- **双输入源**——麦克风实时采集，或拖拽 / 选择本地音频文件进行分析。
- **整文件分析**——导入音频后给出时长、平均音高 / F1 / F2 / 音强、发声占比等汇总指标。
- **中英双语**——内置语言切换器，选择会持久化到 `localStorage`。
- **明暗主题**——右上角一键切换，跟随 `.dark` 设计令牌。
- **完全本地化**——基于 [`praat-wasm`](https://github.com/rnnh/praat-wasm) 的声学分析在浏览器内完成，无需后端。

---

## 技术栈

| 领域 | 选型 |
| --- | --- |
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 声学分析 | [`praat-wasm`](https://github.com/rnnh/praat-wasm)（Praat 的 WebAssembly 移植） |
| 音频采集 | Web Audio API（`getUserMedia` / `decodeAudioData`） |
| 国际化 | i18next · react-i18next · i18next-browser-languagedetector |
| 图标 | lucide-react |
| 设计系统 | 自研 **Khej UI**（东方美学，见下方「设计系统」章节），纯 CSS 令牌 |
| 代码检查 | Oxlint |

---

## 快速开始

需要 **Node 20+**（推荐 22+）。包管理器可使用 bun / npm / pnpm，仓库已附带 `bun.lock`。

```bash
# 安装依赖
bun install        # 或 npm install / pnpm install

# 启动开发服务器（默认 http://localhost:5173）
bun run dev

# 生产构建（先跑类型检查 tsc -b，再 vite build）
bun run build

# 本地预览构建产物
bun run preview

# 代码检查
bun run lint
```

> 麦克风采集依赖安全上下文：在 `http://localhost` 下可直接使用；部署到公网时必须使用 HTTPS，否则 `getUserMedia` 会被浏览器拒绝。

---

## 目录结构

```
.
├── index.html              应用入口
├── vite.config.ts          Vite 配置（含 praat-wasm 所需的 COOP/COEP 响应头）
├── public/
│   └── praat.wasm          Praat WASM 二进制（运行时从 /praat.wasm 加载）
├── src/
│   ├── main.tsx            应用引导
│   ├── App.tsx             主界面与状态编排
│   ├── audio/
│   │   ├── engine.ts       统一音频采集层（麦克风 / 文件 → 分析器 + PCM 环形缓冲）
│   │   └── praat.ts        praat-wasm 封装（WAV 编码、窗口分析、整文件分析）
│   ├── components/         UI 组件（Spectrogram / MetricsPanel / PitchHistory / TargetPanel / PracticePanel / LanguageMenu …）
│   ├── i18n/               文案与语言注册（zh / en）
│   ├── styles/             全局样式与令牌（app.css / colors_and_type.css / components.css）
│   └── types.ts            共享领域类型
└── khej-ui/                自研设计系统（令牌、组件契约、预览页、Agent 技能清单）
```

---

## 使用说明

1. **开始麦克风**——点击「开始麦克风」授权后，界面即进入实时分析；再次点击按钮停止。
2. **导入文件**——把音频文件拖到传输区，或点击「浏览文件」选择。支持 WAV / MP3 / OGG / FLAC 等常见格式。文件会边播放边分析，并给出整文件汇总。
3. **设定目标**——在「练习目标」卡片中调整音高上下限、F1/F2 目标与容差；也可一键套用预设参考。
4. **查看反馈**——指标面板与练习反馈卡片会以目标区间为参照，给出实时提示与稳定度评分（0–100）。
5. **全屏**——点击时频谱右上角的全屏按钮进入大图模式，`Esc` 退出。

---

## 隐私

所有音频采集、解码与声学分析均在浏览器内完成，没有任何网络上传。音频文件仅在本地被 `decodeAudioData` 解码后送入 Praat WASM 分析，处理完即丢弃。

---

## 国际化

文案集中在 `src/i18n/locales/<code>/translation.json`，目前支持 **中文（默认）** 与 **English**。

新增语言：

1. 在 `src/i18n/locales/` 下新建 `<code>/translation.json`，镜像现有键结构；
2. 在 `src/i18n/index.ts` 中 `import` 该文件，并把它加入 `supportedLanguages` 与 `resources`；
3. 在 `zh` / `en` 的 `lang` 命名空间补充该语言的原生显示名（供切换器展示）。

语言选择通过 `i18next-browser-languagedetector` 持久化（键名 `vp-language`）。

---

## 部署注意事项

Praat WASM 需要**跨源隔离（cross-origin isolation）**才能正常加载，因此运行时必须携带以下响应头：

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

- 开发服务器已在 `vite.config.ts` 的 `server.headers` 中自动注入，**本地调试无需额外配置**。
- **生产环境部署时，必须确保静态服务器 / CDN / 反向代理同样下发这两个响应头**，否则会触发 `status: engineError`（分析引擎加载失败）。
- 确保 `public/praat.wasm` 被正确构建并可由 `/praat.wasm` 访问。
- 如前所述，麦克风功能需要 HTTPS 或 localhost 安全上下文。

---

## 部署到 Cloudflare Pages

推荐用 Cloudflare Pages 的「连接 Git 仓库」方式，零配置自动构建与部署：

1. 登录 Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 选择本仓库（如 `308K/sjwiet`），框架预设选 **None**（Vite 不在预设列表里，手动填写即可）。
3. 构建配置：
   - **Build command**：`npm install && npm run build`（若构建镜像已带 Bun，也可写 `bun install && bun run build`）
   - **Build output directory**：`dist`
   - **Node.js version**：20（或 22）
4. 保存并部署。之后每次推送到 `main` 都会自动重新构建。
5. （可选）在 **Custom domains** 绑定自己的域名；默认会分配 `*.pages.dev` 子域，已满足麦克风所需的 HTTPS 安全上下文。

跨源隔离响应头：本仓库已在 `public/_headers` 中声明 COOP/COEP（构建后位于 `dist/_headers`），Cloudflare Pages 会自动应用，确保 `praat.wasm` 正常加载。若需在仪表盘覆盖，可在 **Settings → Headers** 或用 Transform Rules 下发相同的两个头。

> 注意：`Cross-Origin-Embedder-Policy: require-corp` 会要求所有跨源子资源（如 Google Fonts 的字体文件）本身携带 `Cross-Origin-Resource-Policy` / CORS 头，否则会被拦截、回退到系统字体。若字体显示异常，建议将字体自托管到本项目内。本项目为纯静态站点，无需 Functions，也无需设置环境变量。

## 设计系统（Khej UI）

界面采用自研的 **Khej UI** 设计系统（东方美学：朱砂红主色 `#C53D43`、靛蓝点缀、宣纸暖灰背景、衬线/无衬线双字体、印章式交互），详见 [`khej-ui/README.md`](./khej-ui/README.md)。令牌（颜色 / 字体 / 间距 / 圆角 / 阴影）在 `khej-ui/colors_and_type.css` 与 `src/styles/` 中定义，并包含完整的 `.dark` 暗色覆盖。

---

## 声学分析原理（简述）

- `src/audio/engine.ts` 提供统一的采集层：麦克风走 `getUserMedia`、文件走 Web Audio 解码，二者共同驱动一个 `AnalyserNode`（供时频谱绘制）和一个滚动 PCM 环形缓冲（供 Praat 分析）。
- `src/audio/praat.ts` 懒加载 `praat.wasm`，把 Mono PCM 在内存中编码为 16-bit WAV 后交给 Praat：
  - `analyzeWindow()`：对短窗口（麦克风约 1.0s、文件约 0.5s）在窗口中心取声学快照（音高 / 共振峰 / 音强 / 是否浊音）；
  - `analyzeFile()`：对整段音频求均值与发声占比等汇总指标。
- 主循环用 `requestAnimationFrame` 节流，约 **10 Hz** 调用一次 Praat（两次分析间距 ≥ 100ms），兼顾流畅与性能。

---

## License

本项目基于 **Mozilla Public License 2.0（MPL-2.0）** 开源协议发布。

- 每个源文件在 MPL-2.0 下单独授权；完整协议文本见仓库根目录的 `LICENSE` 文件，也可在 https://mozilla.org/MPL/2.0/ 获取。
- 对文件所做的修改若对外分发，需以 MPL-2.0 形式开源；但与闭源 / 其他许可的代码可按「文件级（file-level）」方式组合使用。
- 第三方依赖（如 `praat-wasm`）遵循各自的上游许可，详情见其对应仓库。
