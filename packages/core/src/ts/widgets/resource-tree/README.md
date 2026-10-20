# ResourceTree

基于 Wunderbaum 0.14.1 的可选资源控件，支持 HTML 和 npm，挂载到指定容器。
已接入 `WidgetManager` 和 SDK 主入口，使用 `earth.widgets.resourceTree` 即可。

## 行为

- 从当前 `config.getAllConfig()` 和已加载资源获取目录，通过资源事件发现动态加入的资源。
- `defaultLoad` 只由 SDK 初始化加载器使用；业务节点的勾选按 `sources.isLoaded()` 判断，眼睛按实际实例显隐判断。
- 目录批量加载逐项执行，部分失败时保留成功项和半选状态；忙碌时禁止树内重复操作。
- 底图和地形单选；新底图创建成功后再隐藏旧底图。原底图实例可复用，失败不影响原选择。
- 点击已加载节点定位；支持影像透明度、显隐、卸载、作为底图/叠加图。
- 业务资源同分类排序、跨分类移动、目录排序；底图和地形不能拖入业务目录。
- 树中越靠上的业务影像在 Cesium 中越靠上；底图固定在下面；重排不重新加载实例。
- 搜索、目录展开状态、稳定节点原位更新、关闭重开、事件解绑、容器内原有内容保留。
- 布局可导入导出；只有设置 `storageKey` 才自动写 localStorage。多地球使用不同 key。
- 提供上移/下移和分类输入操作，拖拽不是唯一操作方式。

## API

```ts
await earth.onReady();
const tree = earth.widgets.resourceTree;
await tree.open({ container: 'tree', draggable: true, allowCrossCatalog: true });
tree.hide(); tree.show(); tree.close();
await tree.open({ container: 'tree' });
await tree.setLoaded(id, true);
await tree.setVisible(id, false);
await tree.setBaseImagery(id);
tree.setAlpha(id, 0.5);
tree.moveResource(id, '其他目录', beforeId);
const state = tree.exportState();
tree.importState(state);
tree.resetState();
tree.destroy();
```

公开异步操作失败时 reject；界面操作会显示错误并调用 `onError`。close 不卸载地球上的资源。

## 数据边界

分类、目录顺序和底图候选身份是此控件的布局，不回写初始化配置，不序列化服务 URL、访问令牌、Cesium 对象或运行时加载状态。
业务需要持久化到服务器时，使用 `onChange(state)`，或显式调用 `exportState()`。

当前 ResourceManager 没有完整的资源目录：控件通过已加载资源和事件保留观察到的动态资源，卸载后仍可重新勾选。
如果资源在控件创建前，或控件关闭期间被动态添加后又卸载，当前底层无法回溯该记录。
之后有统一目录时，传入 `getResources: () => earth.sources.getResources()`，不必改树组件。

影像原生显隐和移动事件会刷新树状态；任意树外跨目录影像交错排序不会自动重写目录布局。
控件内拖放排序会同步 Cesium；普通模型/POI 的目录顺序不表示三维遮挡顺序。

这里不增加 ResourceManager 的并发控制，也不修改它的异步销毁行为。控件关闭期间已开始的加载可以完成；重新打开会读取当前状态。

## 验证

```powershell
npm run typecheck
npm run build
```

真实地球 demo：`http://localhost:5173/demos/resources/resource-tree.html`。
demo 资源使用本地图像、GeoJSON、GLB 和 POI；无效图片/地形条目专门用于失败演示。

## 样式依赖

JS 和 CSS 均直接引用 npm 安装的 Wunderbaum，无需维护 vendor 副本。
Wunderbaum 的 MIT 许可说明保留在源码中，并随样式注入和 SDK 构建产物一起分发。
样式只在挂载后安装，最后一个实例关闭时清理，不需要修改 SDK 样式总入口。
