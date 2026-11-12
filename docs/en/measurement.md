# Measurements

Use `earth.tools.measure` to collect points through `earth.tools.draw` and receive a Promise. Results and numeric labels remain visible by default.

```ts
import { GeoEarth, MeasureCancelledError } from 'geoearth-sdk'

const earth = new GeoEarth('earth')
await earth.onReady()
try {
  const result = await earth.tools.measure.spaceDistance()
  console.log(result.distance, result.positions)
} catch (error) {
  if (!(error instanceof MeasureCancelledError)) throw error
}
```

| Method | Interaction | Result |
| --- | --- | --- |
| `measureHeight()` | One left click | Longitude/latitude in degrees, ellipsoid height in meters, and elevation source |
| `spaceDistance()` | Add points; right click or `finish()` with at least two points | Total 3D segment length and individual lengths, in meters |
| `groundDistance()` | Add points; right click or `finish()` with at least two points | Length of a terrain-sampled, geodesically densified polyline, in meters |
| `surfaceArea()` | Add points; right click or `finish()` with at least three points | Turf spherical area in square meters and ellipsoid perimeter in meters |
| `perimeter()` | Add points; right click or `finish()` with at least three points | Closed ellipsoid geodesic perimeter, in meters |
| `verticalDistance()` | Two left clicks | Signed ellipsoid height difference, absolute distance, vertical endpoints, and the second picked point |
| `measureAngle()` | Three left clicks; the second point is the vertex | Angle between 3D vectors, from 0 to 180 degrees |
| `triangleDistance()` | Two left clicks | Spatial distance and its components along the start point's tangent plane and ellipsoid normal |

Every result has an `id` and a discriminating `type`. Positions are `Cartesian3`; polygon boundaries do not repeat the first vertex. `fractionDigits` affects labels only, preserving calculation precision.

## Calculation scope

- Elevation is ellipsoid height, not altitude above sea level. `ElevationTarget.SURFACE` prefers the scene surface, then terrain or the picked position. `TERRAIN` samples terrain only and falls back to the ellipsoid when unavailable. The returned `source` identifies the actual source.
- Ground distance targets 30-meter sample spacing with a default limit of 4096 samples, retaining control points. Long routes increase spacing automatically. Configure `sampleSpacing` and `maxSamples` as needed. It prefers the most detailed terrain, then loaded terrain or the ellipsoid; `sources` reports the actual sources. Buildings are excluded.
- Area ignores height and covers a simple outer ring without holes; it is not the surface area of terrain relief. Perimeter follows ellipsoid geodesics and ignores height. Adjacent vertices use the shorter longitude interval across the date line. Do not use these methods for polygons spanning a hemisphere, surrounding a pole, or intersecting themselves.
- The measured angle is a spatial angle, not an azimuth. The reference implementation's `measureTriangle` is named `measureAngle` here.
- Triangle distance is intended for local scenes and satisfies the Pythagorean relation. Its vertical component follows the initial normal and includes Earth curvature, unlike the ellipsoid height difference from `verticalDistance()`.

## Display and result management

All measurements accept `{ showResult: false, fractionDigits: 2 }`. Hiding the display still returns and records results.

```ts
const measure = earth.tools.measure
measure.finish()          // Submit fixed vertices; false if incomplete or sampling.
measure.stop()            // Cancel the active task, keeping completed results.
measure.getResults()      // Read completed results.
measure.remove(result.id) // Remove a result and its entities.
measure.clear()           // Cancel and remove all results and entities.
```

Cancellation and task replacement reject with `MeasureCancelledError`. In-flight sampling requests may continue, but late results are discarded. Destroying the globe disposes of the measurement tool.

Display uses `EntityFactory` points, glowing lines, and labels. Spatial segments use `ArcType.NONE` without ground clamping; `depthFailMaterial` keeps hidden segments visible without changing their computed geometry. `EntityFactory` is exported from the package entry.

The demo's measurement pages are independent HTML documents. Their finish action submits vertices or cancels incomplete tasks; the result management page also demonstrates clearing results.
