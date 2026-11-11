# GeoEarth

基于 Cesium 的 TypeScript 三维地球 SDK，提供地球初始化、相机控制、资源管理、绘制量测、对象交互、可视化和常用组件。

项目持续开发中，当前版本为 `0.0.1`，API 可能调整。

## 安装

```bash
npm install geoearth cesium
```

当前支持 Cesium `^1.147.0`，提供 ESM 和 TypeScript 类型声明。以下示例使用 Vite，支持 Vite 7 / 8；开发环境使用 Node.js 22.17+（或 24 LTS）。SDK 在浏览器中运行，SSR 项目应在客户端挂载后加载和初始化。

请使用 Cesium 1.147.0 或更高的兼容版本：独立安装 Cesium 1.146.0 时，其浮动的内部依赖可能导致 ESM 构建报导出缺失。

## Vite 接入

将资源插件加入项目现有的 `plugins` 数组，保留 Vue / React 等已有插件：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { geoEarth } from 'geoearth/vite'

export default defineConfig({
  plugins: [geoEarth()],
})
```

插件设置 Cesium 静态资源路径，在开发时提供资源访问，并在构建时复制 `Assets`、`Workers`、`Widgets` 和 `ThirdParty`，同时注入 Cesium 控件样式。默认资源路径为 `/cesium`。部署在子路径（如 `/app/`）时，使用 `geoEarth({ baseUrl: '/app/cesium' })`，与实际部署路径保持一致。

页面准备一个有明确宽高的容器：

```html
<div id="earth" style="width: 100%; height: 600px"></div>
```

在容器创建后初始化地球：

```ts
import { GeoEarth } from 'geoearth'
import 'geoearth/style.css'

const earth = new GeoEarth('earth')
await earth.onReady()

// 页面或组件卸载时调用：
// earth.destroy()
```

默认使用 SDK 内置的全球影像。使用 Cesium ion 的影像、地形等服务时，需要自行提供有相应权限的 token：

```ts
const earth = new GeoEarth('earth', undefined, {
  ionAccessToken: 'YOUR_CESIUM_ION_TOKEN',
})
```

Vue 中应在 `onMounted` 后初始化，并在 `onBeforeUnmount` 中调用 `earth.destroy()`；React 中应在容器挂载后的 effect 中初始化，并在清理函数中销毁。

不使用 Vite 时，需要自行配置 Cesium 的静态资源访问路径、`CESIUM_BASE_URL` 和 `cesium/Build/Cesium/Widgets/widgets.css`。

## 可选专题模块

按需从以下入口导入：

- `geoearth/thematic/echarts`：ECharts 图表，需额外安装 `echarts@5.6.0`。
- `geoearth/thematic/mapv`：MapV 可视化。
- `geoearth/thematic/heatmap`：热力图。

```bash
npm install echarts@5.6.0
```

## 浏览器脚本接入

也可以将包内 `dist` 的完整内容复制到站点的 `/sdk` 目录，通过 HTTP 服务使用：

```html
<div id="earth" style="width: 100%; height: 600px"></div>
<script>
  window.CESIUM_BASE_URL = '/sdk/cesium/'
</script>
<script src="/sdk/cesium/Cesium.js"></script>
<script src="/sdk/geoearth.js"></script>
<script>
  const earth = new GeoEarth('earth')
  earth.onReady().catch(console.error)
</script>
```

两个脚本需按顺序加载，不要使用 `async`。保留 `dist` 中的配套样式、纹理及 Cesium 资源；`geoearth.js` 会自动加载配套样式。

## 文档与反馈

- [项目源码与接入说明](https://github.com/geodx/geoearth)
- [API 与功能文档](https://github.com/geodx/geoearth/tree/main/docs)
- [问题反馈](https://github.com/geodx/geoearth/issues)

## 许可

GeoEarth 使用 [Apache License 2.0](./LICENSE)。第三方组件及其许可见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) 和包内附带的第三方许可文件。
