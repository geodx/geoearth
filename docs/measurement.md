# 测量工具

入口为 `earth.tools.measure`。复用 `earth.tools.draw` 采点，返回 Promise；默认保留结果实体和数值标注，页面可直接 `console.log` 返回数据。

```ts
import { GeoEarth, MeasureCancelledError } from 'geoearth'

const earth = new GeoEarth('earth')
await earth.onReady()

try {
    const result = await earth.tools.measure.spaceDistance()
    console.log(result.distance, result.positions)
} catch (error) {
    if (!(error instanceof MeasureCancelledError)) throw error
}
```

| 方法 | 采点方式 | 返回数据的含义 |
|---|---|---|
| `measureHeight()` | 一次左键 | 经度/纬度（度）、椭球高（米）、高程来源 |
| `spaceDistance()` | 左键加点，右键或 `finish()` 完成，至少两点 | 三维直线段总长度、各段长度，单位米 |
| `groundDistance()` | 左键加点，右键或 `finish()` 完成，至少两点 | 沿测地线加密并采样地形后的折线长度，单位米 |
| `surfaceArea()` | 左键加点，右键或 `finish()` 完成，至少三点 | Turf 球面面积（平方米），另含椭球周长（米） |
| `perimeter()` | 左键加点，右键或 `finish()` 完成，至少三点 | 闭合边界的椭球测地线周长，单位米 |
| `verticalDistance()` | 两次左键 | 有符号椭球高差、绝对距离、竖直线两端和第二个拾取点 |
| `measureAngle()` | 三次左键，第二点为顶点 | 三维向量夹角，单位度，范围 0～180 |
| `triangleDistance()` | 两次左键 | 空间距离，以及沿起点切平面和椭球法线分解的水平、竖直距离 |

所有返回结果均含 `id` 和用于类型收窄的 `type`。位置使用 `Cartesian3`，多边形边界不重复首点。距离/面积保留原始计算精度，`fractionDigits` 只控制标注。

## 计算范围

- 点高程不是海拔。`ElevationTarget.SURFACE` 优先采样场景表面，再回退到地形或拾取位置；`TERRAIN` 只测地形，无数据时回退椭球。返回 `source` 说明实际来源。
- 贴地距离按默认 30 米的目标间距采样，总采样点数默认不超过 4096（至少保留控制点）。长路径自动增大间距，可用 `sampleSpacing` 和 `maxSamples` 调整。优先查询最高精度地形，缺失时使用已加载地形或椭球，`sources` 说明实际来源；不采样建筑表面。
- 面积忽略高度，按简单多边形外环计算，不包含洞，也不计算地形起伏表面积。周长使用椭球测地线，忽略高度。跨日期变更线采用相邻节点间的短经度区间；不用于跨半球、极点环绕或自交多边形。
- 角度是空间夹角，不是方位角。参考代码中的 `measureTriangle` 在这里明确命名为 `measureAngle`。
- 三角量距适合局部场景，满足勾股关系；其中竖直分量沿起点法线，会包含地球曲率的影响，与 `verticalDistance()` 的椭球高差含义不同。参考代码空缺的 `CesiumTriangle` 由此方法补足。

## 展示与结果管理

所有测量支持 `{ showResult: false, fractionDigits: 2 }`。关闭展示仍返回并记录结果。

```ts
const measure = earth.tools.measure
measure.finish()           // 提交已固定的折线/多边形；不足点数或正在采样时返回 false
measure.stop()             // 取消当前任务，立即拒绝 Promise；保留已有结果
measure.getResults()       // 所有已完成结果
measure.remove(result.id)  // 删除指定结果及其实体
measure.clear()            // 停止当前任务并清空所有结果及实体
```

右键取消、主动停止和任务替换统一使用 `MeasureCancelledError`。已发出的采样请求不能真正中断，但迟到结果不会落图。地球销毁时统一销毁测量工具。

展示复用 `EntityFactory`：点、发光线和文字标签。空间线段使用 `ArcType.NONE` 且不贴地，遮挡部分设置 `depthFailMaterial`，避免显示成与计算不一致的地表曲线。`EntityFactory` 已从包入口导出。

示例站点的“测量工具”下有独立 HTML 页面，每页两个按钮。结果管理页通过“结束并清空”演示清理，其余页面通过“结束”提交节点或取消未完成任务。
