# Height limits

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

`height` and `upperHeight` are absolute ellipsoid heights in meters. Within the boundary, 3D Tiles surfaces between these heights receive classification highlighting. The default upperHeight is 200000 meters. A local classification volume preserves the scene's original invertClassification setting.

`hierarchy` accepts geographic coordinate objects, Cartesian3 arrays, or PolygonHierarchy with holes. Supply a valid polygon with nonzero area. The SDK copies geometry and color; later mutations of your original objects do not affect the analysis. `show` defaults to true.

`update()` changes boundary, heights, color, and visibility together. Invalid parameters preserve the previous result. Repeated destruction is safe; earth.destroy() cleans up instance-created analyses. A standalone Viewer can use `new HeightLimitAnalysis(viewer, options)` with caller-managed cleanup.

The demo loads the Giant Wild Goose Pagoda 3D Tiles, world terrain, and Bing imagery. It includes boundary drawing, highlight color, reference plane, visibility, and clearing. The UI adds a relative height limit to a base ellipsoid height to produce the absolute height passed to the SDK. Adjust the base to align model and terrain data that use different vertical datums.
