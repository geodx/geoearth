[English](./README.md) | [简体中文](./README.zh-CN.md)

<div align="center">

<img src="docs/images/tech-globe-sm.webp" width="320" height="299" />
  <br>
<a href="./LICENSE">
  <img src="https://img.shields.io/github/license/geodx/geoearth" alt="Apache License" />
</a>
  <br>  
<h1>GeoEarth</h1>

<strong>基于 Cesium 的 TypeScript 三维地球 SDK。</strong>

<p>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Cesium-6CAD45?style=flat-square" alt="Cesium" />
  <img src="https://img.shields.io/badge/ESM%20%2B%20IIFE-0EA5E9?style=flat-square" alt="ESM 和 IIFE" />
  <img src="https://img.shields.io/badge/status-in%20development-F59E0B?style=flat-square" alt="开发中" />
</p>
</div>

GeoEarth 封装地球初始化、资源管理、交互工具和常用组件，提供 ESM 与浏览器 IIFE 两种接入方式，并配有可在线编辑、运行 HTML 示例的工作台。

> 项目持续开发中，API 和示例会逐步完善。

## 主要功能

- **地球与相机**：地球初始化、开场飞行动画、视角配置。
- **资源管理**：影像、地形、模型、3D Tiles、GeoJSON 和 POI。
- **交互工具**：绘制、量测、相机与鼠标事件、鹰眼组件。
- **示例工作台**：目录搜索、代码编辑、运行与重置、明暗主题、中英文切换。
- **TypeScript 支持**：SDK 提供类型声明，便于代码提示与开发。

## 本地运行

需要 Node.js 22.17 或更高版本，以及 npm。在项目根目录执行：

```bash
npm install
npm run dev
```

该命令先构建 SDK，再启动示例工作台，访问终端输出的地址即可。

示例页面依次加载 `/sdk/cesium/Cesium.js` 和 `/sdk/geoearth.js`，开发服务器会将 `/sdk` 映射到 SDK 的构建目录。修改 SDK 源码后，执行 `npm run build:iife`，再在工作台点击运行或刷新示例。工作台自身的 Vue 代码支持热更新。

## 接入方式

两种方式都通过 `new GeoEarth("container")` 创建地球。容器需要有明确的宽度和高度。

### ESM / Vite 项目

安装 SDK 和 Cesium 后，在 `vite.config.ts` 中使用资源插件：

```ts
import { defineConfig } from "vite";
import { geoEarth } from "geoearth-sdk/vite";

export default defineConfig({
  plugins: [geoEarth()],
});
```

在容器创建后初始化：

```ts
import { GeoEarth } from "geoearth-sdk";
import "geoearth-sdk/style.css";

const earth = new GeoEarth("container");
await earth.onReady();
```

插件负责 Cesium 静态资源路径、资源复制和控件样式加载。

### HTML 页面

将 `packages/core/dist` 的完整内容部署到网站的 `/sdk` 目录，通过 HTTP 服务访问页面：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>GeoEarth 示例</title>
  </head>
  <body>
    <div id="container"></div>
    <script>
      window.CESIUM_BASE_URL = "/sdk/cesium/";
    </script>
    <script src="/sdk/cesium/Cesium.js"></script>
    <script src="/sdk/geoearth.js"></script>
    <script>
      const earth = new GeoEarth("container");
      earth.onReady().catch(console.error);
    </script>
  </body>
</html>
```

`geoearth.js` 不包含 Cesium 主代码，使用先加载的全局 `Cesium`，并自动加载配套样式。构建会将当前安装版本的 `Cesium.js` 和静态资源复制到 `dist/cesium`；部署时需保留同目录的 `geoearth.css`、`assets` 和 `cesium` 资源目录。两个脚本按顺序加载，不要使用 `async`。HTML 可以直接调用 `Cesium.Cartesian3` 等原生 API，SDK 和页面共享同一份 Cesium。

页面或组件不再使用地球时，调用 `earth.destroy()` 释放资源。

对象拾取、高亮与属性展示使用 `earth.interaction`，用法见 [对象交互 API](docs/interaction.md)。

## 常用命令

| 命令                    | 说明                                  |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | 构建 SDK 并启动示例工作台             |
| `npm run build`         | 构建 ESM、IIFE、样式和类型声明        |
| `npm run build:iife`    | 单独构建浏览器 IIFE 产物              |
| `npm run build:example` | 构建 SDK 和示例网站                   |
| `npm run typecheck`     | 检查 SDK 的 TypeScript 类型           |
| `npm run pack:geoearth` | 先构建 SDK，再预览 npm 包内容，不生成压缩包 |

SDK 输出到 `packages/core/dist`；示例网站输出到 `examples/vue-demo/dist`，其中包含 `sdk` 目录。

## npm 发布

发布对象是 `packages/core` 中的 `geoearth-sdk` 公开包，根工作区保持 `private: true`。npm 使用说明见 [SDK README](packages/core/README.zh-CN.md)。在项目根目录执行：

```bash
npm run typecheck
npm run pack:geoearth
npm pack -w packages/core
```

`npm pack` 和 `npm publish` 会通过 `prepack` 自动重新构建 SDK。实际发布前，应将生成的 `geoearth-sdk-<version>.tgz` 安装到独立项目，验证类型检查、构建和浏览器运行；文件名中的 `<version>` 对应包的实际版本号。

使用拥有 `geoearth-sdk` 包发布权限的 npm 账号执行；首次发布时由 npm 校验包名并创建包：

```bash
npm login --registry=https://registry.npmjs.org/
npm publish -w packages/core --access public --registry=https://registry.npmjs.org/
```

`geoearth` 因与已有的 `geo-earth` 过于相似被 npm 拒绝，当前使用 `geoearth-sdk`；查询包名返回 404 不代表 npm 一定允许注册。后续发布需提高 `packages/core/package.json` 的版本号并同步锁文件。已发布的同名同版本不能重复发布。

## 项目结构

官网与文档站位于 `docs/`，独立于示例工作台：

```bash
npm run dev:site
npm run build:site
```

Cloudflare Pages 连接同一个 GitHub 仓库，分别创建两个项目。生产分支选择 `main`，根目录保持仓库根目录，Node.js 版本由 `.node-version` 指定：

| 站点 | 自定义域名 | 构建命令 | 构建输出目录 |
| --- | --- | --- | --- |
| 官网与文档 | `geoearth.dev` | `npm run build:site` | `docs/dist` |
| 在线示例 | `demo.geoearth.dev` | `npm run build:example` | `examples/vue-demo/dist` |

连接 Git 集成后，推送到生产分支会自动更新网站。官网的示例链接默认指向 `https://demo.geoearth.dev`；如需改地址，设置官网项目的 `VITE_DEMO_URL` 构建环境变量。两个站点的图标分别保存在各自的 `public/` 目录。

```text
geoearth/
├─ packages/core/          SDK 核心包
│  ├─ src/ts/             TypeScript 业务代码
│  ├─ src/assets/         图片等资源
│  ├─ src/styles/         样式
│  ├─ vite.config.ts      ESM 构建
│  └─ vite.iife.config.ts 浏览器 IIFE 构建
├─ docs/                  官网与文档站
│  ├─ src/               首页、文档阅读和导航
│  ├─ public/            图片、图标与静态资源
│  └─ *.md               功能文档
└─ examples/vue-demo/      示例工作台
   ├─ public/demos/       独立 HTML 示例
   └─ src/                布局、组件、页面和国际化
```

工作台开发与新增示例说明见 [示例工作台 README](examples/vue-demo/README.zh-CN.md)。

## 反馈与许可

欢迎通过 [Issues](https://github.com/geodx/geoearth/issues) 提交问题与建议。许可条款见 [LICENSE](LICENSE)。

## 语言

README.md 默认英文，README.zh-CN.md 为中文。官网首次按浏览器首选语言显示：中文环境使用简体中文，其他环境默认英文；顶部可手动切换并记住选择。也可使用 `?lang=en` 或 `?lang=zh-CN` 指定语言。

中文功能文档保留在 docs/*.md，英文版本位于 docs/en/*.md，界面翻译位于 docs/src/locales；修改 API 时请同步维护两种语言。
