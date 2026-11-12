# Terrain profiles

`earth.analysis.computeProfile(path, options)` computes distance and elevation along a multi-segment path. Browser scripts and npm/ESM use the same instance API.

```ts
const controller = new AbortController()
const path = await earth.tools.draw.drawPolyLine()
const result = await earth.analysis.computeProfile(path, {
  source: 'terrain', sampleSpacing: 30, maxSamples: 4096,
  signal: controller.signal,
})
const chartData = result.samples.map(point => [point.distance, point.height])
console.log(result.totalDistance, result.lowestPoint, result.highestPoint)
```

Paths accept Cartesian3 positions or objects with longitude, latitude, and height. Each ellipsoid geodesic segment is densified, retaining bends and endpoints and skipping consecutive duplicate horizontal positions. Distance is cumulative horizontal ellipsoid distance in meters; elevation is ellipsoid height in meters.

| Option | Meaning |
| --- | --- |
| source | Default terrain. Surface samples models/scene surfaces with per-point terrain fallback |
| sampleSpacing | Target spacing; default 30 meters |
| maxSamples | Default 4096. Spacing increases to respect the cap; too many control points cause an error |
| terrainLevel | Explicit level from 0 to 30, useful for custom terrain without availability |
| exclude | Objects excluded from surface sampling, such as result lines and markers |
| signal | Cancel through AbortController |

Results include samples (longitude, latitude, height, distance), totalDistance, lowestPoint, highestPoint, source, and terrainSource. `terrainSource` identifies the ground used directly or as fallback: terrain or ellipsoid. Ellipsoid terrain returns zero elevation.

Without terrainLevel, terrain with availability uses the most detailed samples; other providers use loaded surface heights. Unavailable heights cause errors. Sampling failures propagate; changing terrain during computation requires a new calculation.

Destroying GeoEarth cancels pending profiles. With a standalone Viewer, import `computeProfile(viewer, path, options)` and manage cancellation through signal. Cancellation immediately settles the returned Promise, although existing Cesium requests may continue.

The profile demo uses `earth.sources.presets.addWorldTerrain()` and `addBingImagery()`. Its default route near the Longmen Mountains passes a GLB model. The map fills the container with a floating chart along the bottom. Switch terrain/surface modes, draw routes, change spacing, cancel, or clear results. Moving the ECharts pointer locates the corresponding map position. ECharts is loaded by the demo separately.
