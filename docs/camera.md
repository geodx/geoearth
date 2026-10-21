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

键盘漫游、环绕和路径巡航留作后续独立控制器，不塞进基础管理器。初始化与鹰眼内部仍直接使用各自 Viewer 的 Cesium 接口。
