# 限高分析

```ts
const analysis = earth.analysis.addHeightLimit({
    hierarchy: positions,
    height: 450,
    color: Cesium.Color.RED.withAlpha(0.6),
})

analysis.height = 470
analysis.update({ hierarchy: nextPositions, color: Cesium.Color.ORANGE.withAlpha(0.6) })
analysis.show = false
analysis.destroy()
```

height 和 upperHeight 均为绝对椭球高度，单位米。范围内处于这两个高度之间的 3D Tiles 表面会被分类高亮，upperHeight 默认 200000 米。分析使用局部分类体，保留场景原有的 invertClassification 设置。

hierarchy 可传入经纬度对象或 Cartesian3 的数组，也可使用包含孔洞的 PolygonHierarchy。范围须为有面积的有效多边形。SDK 复制范围和颜色，调用方后续修改原对象不会影响分析结果。show 默认为 true。

update() 可同时修改范围、高度、上界、颜色和显隐。参数校验失败时保留原结果。销毁可重复调用，传入 GeoEarth 时会随 earth.destroy() 清理。直接使用 Viewer 时可通过 new HeightLimitAnalysis(viewer, options) 创建并自行清理。

打开“分析 → 限高”。示例加载大雁塔 3D Tiles、世界地形和 Bing 影像，提供范围绘制、超高颜色、参考面、显隐和清除。界面的“相对基准限高”加上“基准椭球高”得到 SDK 接收的 height，并在面板上显示判定椭球高。地形与模型可能采用不同的高程基准，可调整界面的基准值对齐数据。
