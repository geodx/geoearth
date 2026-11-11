# 剖面分析

通过 `earth.analysis.computeProfile(path, options)` 计算多段路径的距离与高程。HTML 和 npm/ESM 使用相同的实例入口。

```ts
const controller = new AbortController()
const path = await earth.tools.draw.drawPolyLine()
const result = await earth.analysis.computeProfile(path, {
    source: 'terrain',
    sampleSpacing: 30,
    maxSamples: 4096,
    signal: controller.signal,
})

// 每个点包含 longitude、latitude、height、distance。
const chartData = result.samples.map(point => [point.distance, point.height])
console.log(result.totalDistance, result.lowestPoint, result.highestPoint)
```

路径支持 Cartesian3 或包含 longitude、latitude、height 的经纬度对象。沿每段椭球测地线加密，保留转折点和末点，跳过连续重复的水平位置。距离为累计椭球水平距离，单位米。高度为椭球高，单位米。

| 参数 | 含义 |
| --- | --- |
| source | 默认 terrain。surface 查询模型和场景表面，缺失处逐点回退到地形。 |
| sampleSpacing | 目标采样间距，默认 30 米。 |
| maxSamples | 总点数上限，默认 4096。达到上限时自动增大间距，控制点数量超过上限时抛错。 |
| terrainLevel | 显式地形采样级别，0～30。适合无 availability 的自定义地形。 |
| exclude | surface 查询时排除的对象，例如显示剖面的线和标记。 |
| signal | 通过 AbortController 取消计算。 |

结果包含 samples、totalDistance、lowestPoint、highestPoint、source 和 terrainSource。terrainSource 标识地形及表面查询回退所使用的地面来源，值为 terrain 或 ellipsoid。椭球地形返回零高程。

省略 terrainLevel 时，有 availability 的地形使用最高精度采样，其他地形使用已加载的地表高度。高度不可用时抛错。采样错误会传递给调用方，地形在计算期间切换时需要重新计算。

传入 GeoEarth 时，销毁地球会取消尚未完成的剖面计算。单独使用 Viewer 可导入 `computeProfile(viewer, path, options)`，并通过 signal 管理取消。取消会立即结束返回的 Promise，Cesium 已发出的采样请求可能继续完成。

运行示例站点后打开“分析 → 剖面”。示例调用 `earth.sources.presets.addWorldTerrain()` 和 `addBingImagery()` 加载世界地形与 Bing 影像，默认路径位于龙门山附近并经过 GLB 模型。地图铺满容器，剖面曲线浮动在地图底部。可切换地形与场景表面，绘制折线、修改间距、取消计算和清除结果。移动 ECharts 曲线指针会在地图上显示对应位置。ECharts 由示例页单独加载。
