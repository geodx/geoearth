# GeoEarth 示例工作台

Vue 负责示例目录、代码编辑器和页面布局；每个示例都是独立 HTML，通过 `/sdk/geoearth.js` 使用 SDK。

## 开发与构建

在仓库根目录运行：

- `npm run dev`：先构建 SDK，再启动示例开发服务器。
- `npm run build:iife`：修改 SDK 后重新生成浏览器产物，随后在工作台点击运行或刷新独立示例。
- `npm run build:example`：构建 SDK 和示例网站，输出到 `examples/vue-demo/dist`。

开发服务器将 `/sdk` 映射到 `packages/core/dist`；生产构建会将 SDK 复制到示例网站的 `dist/sdk`。部署时需保证 `/sdk/geoearth.js` 及其配套资源可从站点根路径访问。

示例网站自身的 Vue 代码支持 Vite 热更新；SDK 当前使用构建产物，不直接连接源码热更新。

示例控制面板使用 lil-gui，通过 `/demo-vendor/lil-gui/lil-gui.umd.min.js` 加载本地脚本。开发服务器映射 npm 依赖，生产构建自动复制脚本及许可证；共享面板样式位于 `public/demo-common/panel.css`。部署时保留 `demo-vendor` 和 `demo-common` 目录。

## 文件职责

```text
public/demos/             独立 HTML 示例，构建时原样复制
src/
  App.vue                初始化共享状态和 Element Plus 语言
  layouts/
    WorkbenchLayout.vue  顶部导航、左侧图标栏和页面容器
  views/
    Playground.vue       选择示例、读取源码、运行和重置
  components/
    directory/           目录导航、搜索和选择
    playground/          代码编辑器、运行预览和编辑设置
    ResizablePanels.vue  分栏与拖拽
  composables/
    useWorkbench.ts      工作台设置和面板状态
  demos/
    registry.ts          示例目录树与查询索引
  locales/               翻译和语言设置
  router/                示例路由
  style.css              全局主题、基础样式及共享弹层样式
```

新增示例时，将 HTML 放到 `public/demos`，再在 `src/demos/registry.ts` 注册路径和翻译键。HTML 也可以通过开发服务器的 `/demos/...` 地址单独打开。

切换目录和代码面板只改变可见内容。编辑源码后点击“运行”，预览才会执行新代码；“重置”恢复当前示例的原始源码并重新运行。
