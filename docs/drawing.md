# 绘制工具

入口为 `earth.tools.draw`。SDK 负责交互、临时预览和坐标返回；业务或示例负责创建、保留最终 Entity。完成、取消、异常和销毁都会解除绘制输入并清理预览。量测继续复用这一入口，不另建鼠标 handler。

## 类型与单位

- `CoordinateType.CARTESIAN3`：默认，返回 Cesium `Cartesian3`，坐标单位为米。
- `CoordinateType.CARTOGRAPHIC`：返回 Cesium `Cartographic`，经纬度为弧度，高度为米。
- `CoordinateType.DEGREES`：返回 `DegreePosition`，经纬度为度，高度为米。它是 SDK `WorldDegree` 的类型别名，不维护第二份经纬度结构。
- 高度均为椭球高；贴地显示不等于对返回坐标执行地形高程采样。
- `onMove` 与最终返回值使用同一个坐标格式。回调接收独立坐标快照，不暴露内部可变数组。
- 非默认格式必须显式传入 `coordinateType`，不能仅写一个泛型参数让类型与运行时默认值不一致。

```ts
import { CoordinateType, DrawCancelledError } from 'geoearth'
import type { DrawCircleOptions } from 'geoearth'

const options: DrawCircleOptions<CoordinateType.DEGREES> = {
  coordinateType: CoordinateType.DEGREES,
  onMove(circle) {
    console.log(circle.center.longitude, circle.radius)
  },
}

try {
  const circle = await earth.tools.draw.drawCircle(options)
  // center、endPoint 是 DegreePosition；radius 是椭球面半径，单位为米。
  console.log(circle)
} catch (error) {
  if (!(error instanceof DrawCancelledError)) throw error
}
```

选项、结果和坐标类型均从包入口导出，不需要导入 `dist/ts/...` 等内部路径。

## 方法与完成方式

| 方法 | 交互 | 结果 |
| --- | --- | --- |
| `drawPoint()` | 左键完成，右键取消 | 一个坐标 |
| `drawLine()` | 两次左键，右键取消 | 两点元组，表示线段 |
| `drawPolyLine()` | 左键加点，右键/`finish()` 完成，至少两点 | 固定节点数组 |
| `drawAngle()` | 三次左键 | 起点、角顶点、终点；不计算角度 |
| `drawTriangle()` | 三次左键 | 三角形三点元组 |
| `drawPolygon()` | 左键加点，右键/`finish()` 完成，至少三点 | 外环节点，不重复首点，不包含洞 |
| `drawCircle()` | 左键圆心，左键圆周点 | `{ center, endPoint, radius }` |
| `drawRectangle()` | 两次左键指定对角点 | 西北、东北、东南、西南四角 |
| `drawInclinedRectangle()` | 两点指定底边，第三点指定侧向宽度 | A、B、C、D 四角 |
| `drawHeightDifference()` | 两次左键 | `{ start, end, pickedEnd, heightDifference }` |
| `drawYPlane(options)` | 拖动平面，左键松开完成，右键取消 | `{ position, normal, distance }` |

这里按参考库区分了线段与折线：原折线示例现在调用 `drawPolyLine()`；`drawLine()` 用于两点线段。参考库名为 `drawTriangle` 的角采集在本包中对应 `drawAngle()`，三角面另由 `drawTriangle()` 提供。

参考库的 `drawHeightDistinct`、`drawYPlan`、`callStop` 分别对应这里的 `drawHeightDifference`、`drawYPlane`、`finish`。使用 Promise 与明确结果类型，不引入 `Function`、`any`、`endCallback`/`errCallback` 的旧接口。

高差采集中的 `end` 与 `start` 同经纬度，高度取第二次点击；`pickedEnd` 保留原始第二个点，`heightDifference` 保留正负号。额外地形采样、角度计算及量测标签属于 MeasureTool，不放进 DrawTool。

平面的 `normal` 会标准化，`dimensions`、`distance` 均为实体局部坐标下的米制参数。上下拖动的像素距离通过 `metersPerPixel` 转为米，不是把屏幕像素直接当成地理坐标。工具仅在拖动期间关闭相机输入，结束、取消、异常时恢复原值。

## 通用状态和预览

- `isActive`：当前是否正在绘制。
- `activeChanged`：交互模块据此暂停/恢复拾取和高亮。
- `finish()`：确认当前可完成的采集；节点不足或几何退化返回 `false` 并继续等待。
- `cancel()`：取消当前任务，Promise 以 `DrawCancelledError` 拒绝，返回是否确有任务被取消。
- `clearPreview()`：清空临时预览；如正在采集，同时取消任务，避免留下不可见的活动任务。
- `destroy()`：清理输入和数据源，可重复调用；销毁后不能再次开始采集。

`showPreview:false` 关闭临时图形，仍然采点并触发 `onMove`。`showVertex` 控制临时节点。线默认不贴地，面和圆默认贴地；`color`、`width`、`fillColor`、`outlineColor` 用于预览。最终结果样式由调用方的 Entity 设置。

多点预览数组可能包含尚未固定的鼠标位置；最终数组只含固定节点。圆与矩形会在最终左键点击时重新计算，不依赖此前是否触发过鼠标移动。

## 几何辅助方法的位置

```text
packages/core/src/ts/utils/geometry/
  rectangles.ts   # getRectanglePoints / getInclinedRectangle
  index.ts
```

两个函数只做数学计算，不依赖 Viewer、屏幕事件、Entity 或全局主地球，可用于其他模块，也可从 `geoearth` 包入口导入。

- `getRectanglePoints(start, end, ellipsoid?)`：经纬线对齐，保留起点椭球高；跨日期变更线时采用短经度区间。
- `getInclinedRectangle(start, end, offset, ellipsoid?)`：按局部三维底边和侧向投影计算正交四角，不修改输入。它是局部平面几何，不能当作全球范围的测地矩形；大范围使用时侧角椭球高会因地球曲率变化。
- 返回四角均不重复首点。需要画闭合边线时，显示层可使用 `[...corners, corners[0]]`。
- 非有限坐标、重合底边及零宽矩形明确拒绝。

## 示例与验证

- 示例站点 → 绘制工具 → 绘制圆、绘制矩形、绘制多边形，均为独立 HTML。
- 这三个页面只提供“开始绘制”和“结束”两个按钮，结果通过 `console.log` 输出，同时保留图形；页面离开时销毁地球。
- 多边形达到三点后点击“结束”提交结果；圆和矩形选好两点自动完成，“结束”用于取消未完成的绘制。
- 绘制工具只负责临时预览，完成后清理预览；示例把工厂创建的最终实体加入独立 `CustomDataSource`，后续取消不会清除已有图形。

展示方法及选项类型均从包入口导出：

```ts
import { EntityFactory, type EntityAreaOptions, type EntityLineOptions } from 'geoearth'
import { CustomDataSource } from 'cesium'

// 默认返回 Cartesian3，可直接传给工厂；HTML 中使用 GeoEarth.EntityFactory。
const results = new CustomDataSource('draw-results')
await earth.viewer.dataSources.add(results)
const circle = await earth.tools.draw.drawCircle()
results.entities.add(EntityFactory.createCircle(circle.center, circle.radius))

const corners = await earth.tools.draw.drawRectangle()
results.entities.add(EntityFactory.createPolygon(corners))
```

`createCircle` 和 `createPolygon` 默认贴地；传 `{ clampToGround: false }` 保留输入位置的高度，可设置 `fillColor`、`outlineColor` 和 `width`。`createCircle` 创建普通圆面，不附加高度连线；`createHeightEllipse` 保留原有用途。
