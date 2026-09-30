# GeoEarth

**基于 Cesium 的 TypeScript 三维地球 SDK。**

GeoEarth 封装地球初始化、资源管理、交互工具和常用组件，提供 ESM 与浏览器 IIFE 两种接入方式，并配有可在线编辑、运行 HTML 示例的工作台。

> 项目持续开发中，API 和示例会逐步完善。

## 主要功能

- **地球与相机**：地球初始化、开场飞行动画、视角配置。
- **资源管理**：影像、地形、模型、3D Tiles、GeoJSON 和 POI。
- **交互工具**：绘制、量测、相机与鼠标事件、鹰眼组件。
- **示例工作台**：目录搜索、代码编辑、运行与重置、明暗主题、中英文切换。
- **TypeScript 支持**：SDK 提供类型声明，便于代码提示与开发。

## 本地运行

需要 Node.js 22.12 或更高版本，以及 npm。在项目根目录执行：

```bash
npm install
npm run dev
```

该命令先构建 SDK，再启动示例工作台，访问终端输出的地址即可。

示例页面使用 `/sdk/geoearth.js`，开发服务器会将 `/sdk` 映射到 SDK 的构建目录。修改 SDK 源码后，执行 `npm run build:iife`，再在工作台点击运行或刷新示例。工作台自身的 Vue 代码支持热更新。

## 接入方式

两种方式都通过 `new GeoEarth("container")` 创建地球。容器需要有明确的宽度和高度。

### ESM / Vite 项目

安装 SDK 和 Cesium 后，在 `vite.config.ts` 中使用资源插件：

```ts
import { defineConfig } from "vite";
import { geoEarth } from "geoearth/vite";

export default defineConfig({
  plugins: [geoEarth()],
});
```

在容器创建后初始化：

```ts
import { GeoEarth } from "geoearth";
import "geoearth/style.css";

const earth = new GeoEarth("container");
await earth.ready;
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
    <style>
      html, body, #container { width: 100%; height: 100%; margin: 0; }
    </style>
  </head>
  <body>
    <div id="container"></div>
    <script src="/sdk/geoearth.js"></script>
    <script>
      const earth = new GeoEarth("container");
      earth.ready.catch(console.error);
    </script>
  </body>
</html>
```

`geoearth.js` 包含 Cesium 主代码，并自动加载配套样式。部署时需保留同目录的 `geoearth.css`、`assets` 和 `cesium` 资源目录。

页面或组件不再使用地球时，调用 `earth.destroy()` 释放资源。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 构建 SDK 并启动示例工作台 |
| `npm run build` | 构建 ESM、IIFE、样式和类型声明 |
| `npm run build:iife` | 单独构建浏览器 IIFE 产物 |
| `npm run build:example` | 构建 SDK 和示例网站 |
| `npm run typecheck` | 检查 SDK 的 TypeScript 类型 |
| `npm run pack:geoearth` | 预览 npm 包将包含的文件，不生成压缩包 |

SDK 输出到 `packages/core/dist`；示例网站输出到 `examples/vue-demo/dist`，其中包含 `sdk` 目录。

## 项目结构

```text
geoearth/
├─ packages/core/          SDK 核心包
│  ├─ src/ts/             TypeScript 业务代码
│  ├─ src/assets/         图片等资源
│  ├─ src/styles/         样式
│  ├─ vite.config.ts      ESM 构建
│  └─ vite.iife.config.ts 浏览器 IIFE 构建
└─ examples/vue-demo/      示例工作台
   ├─ public/demos/       独立 HTML 示例
   └─ src/                布局、组件、页面和国际化
```

工作台开发与新增示例说明见 [示例工作台 README](examples/vue-demo/README.md)。

## 反馈与许可

欢迎通过 [Issues](https://github.com/geoearth-dev/geoearth/issues) 提交问题与建议。许可条款见 [LICENSE](LICENSE)。
