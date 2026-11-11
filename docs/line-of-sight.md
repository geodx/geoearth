# 通视分析

```ts
const controller = new AbortController()
const [observer, target] = await earth.tools.draw.drawLine()
const result = await earth.analysis.computeLineOfSight(observer, target, {
    source: 'surface',
    observerHeight: 2,
    targetHeight: 2,
    sampleSpacing: 20,
    signal: controller.signal,
})

console.log(result.visible, result.distance, result.obstruction)
```

输入接受 Cartesian3 或包含 longitude、latitude、height 的经纬度对象。输入高度是绝对椭球高。observerHeight 与 targetHeight 沿输入位置的椭球法线附加，默认 0 米。distance 是两端的三维直线距离。

| 参数 | 含义 |
| --- | --- |
| source | 默认 surface，检查地形与场景对象；terrain 仅检查地形。 |
| sampleSpacing | 初次地形检查目标间距，默认 30 米，沿三维直线取点。 |
| maxSamples | 初次地形采样上限，默认 4096，至少 3；达到上限时增大间距。 |
| terrainLevel | 可选的显式地形采样级别，0～30，适合自定义地形。 |
| tolerance | 地形穿透和场景端点接触的容差，默认 0.1 米。 |
| exclude | 场景射线排除的实体、图元或 3D Tiles 要素；再次分析时应排除结果线与标记。 |
| signal | 取消任务。传入 GeoEarth 时，销毁地球也会取消计算。 |

visible 为 false 时，obstruction 给出首个遮挡点 position、距观察点的 distance、来源 terrain 或 scene。场景遮挡还返回 Cesium 拾取 object。结果包含实际采用的 sampleSpacing，以及 terrainSource，标识地形或椭球来源。椭球解析求交时 sampleSpacing 为 0。

地形检测保留地球曲率。椭球地面使用解析求交，真实地形沿三维视线采样，发现首段穿透后最多追加 12 次二分采样定位遮挡点。地形分辨率、采样间距和数量上限会影响结果，窄于采样间隔的障碍可能被漏采。

surface 先等待 Entity 的几何更新，再使用三维射线拾取 glTF、场景图元和最高精度 3D Tiles，忽略目标点以外的交点。独立加载的 Model 应在 ready 后参与分析。此模式需要三维场景和深度纹理支持。当前 Cesium 1.146 将 pickFromRayMostDetailed 标记为私有接口，SDK 在 sceneIntersection.ts 中集中适配并检查可用性；升级 Cesium 时应复验。射线使用渲染几何，透明材质的拾取行为也会影响结果。

高度不可用、采样失败或计算期间切换地形会抛错。取消立即结束返回的 Promise，Cesium 已发出的采样和射线请求可能继续完成。独立 Viewer 可通过导出的 computeLineOfSight(viewer, observer, target, options) 调用，并使用 signal 管理取消。

打开“分析 → 通视”。示例使用 addWorldTerrain() 和 addBingImagery()，支持山地、建筑场景，选取两点、调整附加高度、取消与清除。绿色显示观察点到首个遮挡点，红色显示其后的视线段。
