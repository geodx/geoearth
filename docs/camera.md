# 相机控制

相机操作统一通过 `earth.camera`。经纬度、heading、pitch、roll 均为度，高度和距离为米，duration 为秒。省略姿态时默认正北、垂直向下、无翻滚。

```ts
const completed = await earth.camera.flyTo({
    longitude: 106.55, latitude: 29.56, height: 3000,
    heading: 0, pitch: -45, duration: 2
})
const saved = earth.camera.getView()
earth.camera.setView(saved)
```

| 方法 | 行为 |
| --- | --- |
| `flyTo(view)` | 飞到经纬度和相机姿态 |
| `setView(view)` | 立即设置相机视角 |
| `flyToExtent(extent, duration = 2)` | 定位 west/south/east/north 范围，支持跨日期变更线 |
| `flyToTarget(target, options?)` | 定位 Cesium 实体、数据源、影像或 3D Tiles；options 支持 duration、heading、pitch、range |
| `cancelFlight()` | 取消当前飞行及尚在等待目标数据的定位 |
| `getView()` | 返回可保存、可传回 setView/flyTo 的相机视角 |
| `getHeight()` | 相机椭球高度，**不是离地高度或比例尺** |
| `getCenter()` | 屏幕中心射线与地球/已加载地形的交点，无交点返回 undefined；不拾取建筑表面 |
| `getExtent()` | 椭球上的近似可视矩形，无可视范围返回 undefined；west > east 表示跨日期变更线 |
| `resetNorth()` | 保持相机位置和 pitch/roll，heading 归零 |
| `setTopView()` | 移至当前地表中心点上方俯视，无交点返回 false |
| `lockTopView(true/false)` | 设置俯视并禁用鼠标倾斜；解除时恢复原 enableTilt 值 |
| `reset(duration = 2)` | 回到初始化配置视角 |
| `globalView(duration = 2)` | 经度 0、纬度 0 上空 2300 万米俯视 |

`flyTo`、`flyToExtent`、`flyToTarget`、`reset`、`globalView` 返回 Promise<boolean>：完成为 true，取消、被后续操作替代或目标不可定位为 false，底层异常则拒绝 Promise。无效参数同步抛出 RangeError。duration = 0 表示立即完成。

新操作会终止开场动画并取消先前飞行；销毁时也会结束等待。锁定俯视只限制鼠标倾斜，程序仍可主动设置其他姿态。

```ts
import { CameraEventType } from 'geoearth'
const remove = earth.event.camera.addEventListener(CameraEventType.FLY_CANCEL, () => {
    console.log('飞行已取消')
})
// 不再监听时调用 remove()
```

管理器发出 FLY_START、正常完成的 FLY_END、取消或失败的 FLY_CANCEL；原生 CHANGE、MOVE_START、MOVE_END 保持不变。资源管理器的定位也使用此生命周期。开场动画保留独立流程；直接调用 Cesium 原生接口不会产生 SDK 的 FLY_START 事件。

## 旧接口迁移

移除了独立 `flyTo({ viewer, cameraEvent, ... })`，改用 `earth.camera.flyTo(...)`。移除了旧工具函数 getCameraInfo、getCameraHeight、getViewCenter、getCameraRectangle、getCameraRectanglePoint 和 CameraViewType，分别使用 getView、getHeight、getCenter、getExtent 与 CameraView。旧 getCameraRectanglePoint 是屏幕边缘采样多边形；getExtent 为近似矩形，并非相同几何结果。

路径漫游使用独立控制器；键盘漫游暂未实现，环绕观察暂不提供。初始化与鹰眼内部仍直接使用各自 Viewer 的 Cesium 接口。

## 视角书签

入口为 `earth.camera.bookmarks`，实现位于 `camera/bookmark/BookmarkManager.ts`。书签只保存视角和可选缩略图，不保存整个场景或图层配置；默认保存在内存，刷新页面后需重新导入。

```ts
const bookmarks = earth.camera.bookmarks
const bookmark = await bookmarks.create('重庆')
await bookmarks.flyTo(bookmark.id)
bookmarks.save('views.json')
await bookmarks.load() // 从按钮点击事件调用；取消选择返回 undefined
```

`create(name, { thumbnail: false })` 跳过截图。默认缩略图为 320 × 180，支持 width、height 和 description。截图等待下一次 postRender，读取同一帧的图像和视角，不要求 preserveDrawingBuffer；图层未加载完成时截图反映当时画面。跨域污染导致的截图失败会拒绝 Promise；销毁会清理待处理的截图和文件选择。

`get(id)`、`getAll()` 返回副本；`remove(id)`、`clear()` 管理内存列表。`toJSON()` 和 `importJSON(json, replace = true)` 可对接 localStorage 或后端。`save()`、`load(file?, replace = true)` 负责浏览器文件下载和导入；默认整体替换，传 false 则追加，重复 ID 报错。导入失败保持原列表不变。

JSON 格式为 `{ version: 1, bookmarks: [...] }`，每项包含 id、name、view，可选 image、description。导入兼容旧 VGE 的数组格式，将 cameraView 的笛卡尔位置与弧度姿态转换成新的 CameraView。

通用文件功能放在 `utils/browser/files.ts`，直接导出 `saveShareContent(content, fileName, mimeType?)` 和 `readFile({ file?, accept?, signal? })`。前者下载字符串或 Blob，不生成分享链接；后者读取 UTF-8 文本，返回 fileName、fileType（MIME）、fileData。取消选择返回 undefined，读取失败或 AbortSignal 取消则拒绝 Promise。浏览器不提供真实本地路径。

## 路径漫游

入口为 `earth.camera.roaming`，按需创建独立 `PathRoaming` 控制器。参考 VGE 的路线采集、地表采样、模型跟随等功能，移除旧代码的外部 CZML 模板、内置模型路径和 UI 库依赖。

```ts
const roaming = earth.camera.roaming
roaming.setPath([
    { longitude: 106.55, latitude: 29.56, height: 600 },
    { longitude: 106.553, latitude: 29.56, height: 600 },
    { longitude: 106.553, latitude: 29.563, height: 600 },
])
roaming.start({ speed: 10, view: 'thirdPerson' })
roaming.pause()
roaming.resume()
roaming.stop()
```

`setPath()` 接受至少两个不重合的点，高度为椭球高度，角度为度。相邻点之间按三维直线插值，以米/秒计算进度；长距离路线应提供足够密的点，避免直线穿过地球或地形。

`start(options?)` 总是从起点重新播放。`pause()` 保留进度并释放相机，`resume()` 继续，`stop()` 取消未完成的绘制/路径准备并归零，保留路线以便重播。`destroy()` 释放实体和监听；GeoEarth 销毁会自动调用它。`state` 为 idle、playing、paused、completed，`progress` 为 0–1，`duration` 为正常倍速下的总秒数。

| 配置 | 行为 |
| --- | --- |
| speed | 米/秒，默认 10 |
| multiplier | 倍速，默认 1；运行时通过 setMultiplier 调整 |
| view | thirdPerson 跟随、firstPerson 第一人称、none 仅移动对象 |
| pitch / range | 第三人称俯仰角（度）与距离（米），默认 -30 / 100 |
| eyeHeight | 第一人称在路径高度之上的眼高，默认 1.7 米 |
| loop | 循环播放，默认 false；末点与起点不重合时会跳回起点 |
| showPath | 显示路线，默认 true；运行时可调用 setShowPath |
| model | 可选 { uri, scale, minimumPixelSize }，不传则使用点标记 |

`setView('firstPerson')` 等可切换视角。第三人称/第一人称接管鼠标相机输入，暂停、结束、停止时恢复原值和参考坐标系。普通 `earth.camera` 定位会暂停漫游；随后可调用 resume 继续。只支持 3D，开始前应解除外部 trackedEntity。独立进度不修改 Viewer.clock，也不修改 trackedEntity。暂停不跳回开始前的相机位置。

```ts
// 复用已有绘制工具，右键完成；点数不足或主动取消会以 DrawCancelledError 拒绝。
await roaming.drawPath(earth.tools.draw, {
    heightMode: 'surface', heightOffset: 2, sampleSpacing: 30,
})
// 已有路线也可进行地表采样；处理成功为 true，被替代为 false。
await roaming.preparePath(points, { heightMode: 'terrain', heightOffset: 1 })
```

heightMode 支持 absolute（保留每个输入高度）、terrain（地形）、surface（优先模型表面，缺失点逐个回退地形，默认）。heightOffset 按点叠加，sampleSpacing 默认为 30 米，maxSamples 默认为 4096。采样后再插值；没有碰撞检测或自动避障，可能穿过建筑。相邻点及急转弯不会自动平滑。

路线准备失败会保留原路线；stop、setPath、destroy 会使旧异步结果失效，但不会中止 Cesium 正在进行的网络请求。没有可用地形高度时明确报错，不会把未知高度当作 0。椭球地形高度为 0；模型表面采样不可用时使用地形。

旧版 startRoaming/stopRoaming/roamingPath/roamSpeed/runSpeed 等未正式接入的接口，分别由 start、pause 或 stop、setPath、start({ speed })、setMultiplier 替代；人物/车辆/无人机由 model.uri 提供对应模型，不内置静态资源。该版本使用独立播放进度，不再依赖 buildCZML。

### 示例模型

路径漫游示例提供人物、小车、越野车和飞行器选项，资源位于 `examples/vue-demo/public/demo-assets/model/`，从旧 CesiumEarth 项目的同名模型复制。默认使用体积较小的 CesiumMilkTruck；GroundVehicle 作为可选模型。资源仅由示例站托管，不进入 npm SDK。

示例为不同模型配置速度、缩放与观察距离；地面模型采样地形，飞行器使用地形上方 120 米的路线。切换模型后点击开始重新播放。模型骨骼、轮子、螺旋桨动画尚未与独立漫游进度同步，仍需后续处理；原始模型的朝向和原点也需实景验证。
