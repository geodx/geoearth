# Drawing tools

Use `earth.tools.draw` for interaction, temporary previews, and returned coordinates. Your application creates and retains final entities. Completion, cancellation, errors, and destruction all release input handlers and remove previews. Measurement reuses this tool rather than creating another mouse handler.

## Coordinates and units

- `CoordinateType.CARTESIAN3` is the default: Cesium `Cartesian3`, in meters.
- `CoordinateType.CARTOGRAPHIC` returns Cesium `Cartographic`: longitude/latitude in radians, height in meters.
- `CoordinateType.DEGREES` returns `DegreePosition`: longitude/latitude in degrees, height in meters. It aliases the SDK's `WorldDegree` type.
- All heights are ellipsoid heights. Ground-clamped display does not imply terrain sampling of returned coordinates.
- `onMove` uses the same format as the final result and receives independent coordinate snapshots.
- Specify `coordinateType` explicitly for a non-default format; a generic type parameter alone cannot change runtime behavior.

```ts
import { CoordinateType, DrawCancelledError } from 'geoearth-sdk'
import type { DrawCircleOptions } from 'geoearth-sdk'
const options: DrawCircleOptions<CoordinateType.DEGREES> = {
  coordinateType: CoordinateType.DEGREES,
  onMove(circle) { console.log(circle.center.longitude, circle.radius) },
}
try {
  const circle = await earth.tools.draw.drawCircle(options)
  console.log(circle) // DegreePosition center/endPoint; ellipsoid radius in meters.
} catch (error) {
  if (!(error instanceof DrawCancelledError)) throw error
}
```

Options, results, and coordinate types are exported from the package entry. Avoid internal `dist/ts/...` imports.

## Methods and completion

| Method | Interaction | Result |
| --- | --- | --- |
| `drawPoint()` | Left click completes; right click cancels | One coordinate |
| `drawLine()` | Two left clicks; right click cancels | A two-point segment tuple |
| `drawPolyLine()` | Add points; right click/`finish()` with at least two points | Fixed vertex array |
| `drawAngle()` | Three left clicks | Start, vertex, end; no angle calculation |
| `drawTriangle()` | Three left clicks | Three triangle vertices |
| `drawPolygon()` | Add points; right click/`finish()` with at least three points | Outer ring, no repeated first vertex or holes |
| `drawCircle()` | Click center, then perimeter | `{ center, endPoint, radius }` |
| `drawRectangle()` | Click opposite corners | Northwest, northeast, southeast, southwest corners |
| `drawInclinedRectangle()` | Two points define the base, a third defines width | Corners A, B, C, D |
| `drawHeightDifference()` | Two left clicks | `{ start, end, pickedEnd, heightDifference }` |
| `drawYPlane(options)` | Drag the plane; release the left button to finish, right click to cancel | `{ position, normal, distance }` |

`drawLine()` collects a segment; polyline examples use `drawPolyLine()`. The reference library's angle collection named `drawTriangle` corresponds to `drawAngle()` here; `drawTriangle()` collects a triangular face. Reference methods `drawHeightDistinct`, `drawYPlan`, and `callStop` correspond to `drawHeightDifference`, `drawYPlane`, and `finish`. This API uses Promises and explicit result types instead of legacy callbacks.

For height differences, `end` shares the start's longitude/latitude and takes the second click's height. `pickedEnd` retains the original second point; `heightDifference` is signed. Terrain sampling, angle calculation, and labels belong to MeasureTool.

Plane normals are normalized. `dimensions` and `distance` are meters in entity-local coordinates. Vertical drag pixels are converted with `metersPerPixel`. Camera input is disabled only during dragging and restored on completion, cancellation, or error.

## State and previews

- `isActive`: whether a drawing task is active.
- `activeChanged`: interaction uses this to pause/resume picking and highlighting.
- `finish()`: submit a completable task; insufficient or degenerate geometry returns `false` and keeps waiting.
- `cancel()`: reject the task with `DrawCancelledError`; returns whether a task was cancelled.
- `clearPreview()`: remove previews and cancel any active task.
- `destroy()`: release input and data sources; safe to repeat. No new tasks may start afterward.

`showPreview: false` hides temporary graphics while retaining point collection and `onMove`. `showVertex` controls temporary vertices. Lines default to no ground clamping; polygons and circles default to ground clamping. Preview styling uses `color`, `width`, `fillColor`, and `outlineColor`; final entity styling belongs to the caller.

Multi-point previews may include an unfixed pointer position; final arrays contain fixed vertices only. Circles and rectangles recalculate on the final click, even without a preceding pointer move.

## Geometry helpers

`packages/core/src/ts/utils/geometry/rectangles.ts` provides `getRectanglePoints` and `getInclinedRectangle`, also exported from `geoearth-sdk`. These functions perform mathematics without a Viewer, events, entities, or a global globe.

- `getRectanglePoints(start, end, ellipsoid?)` aligns to latitude/longitude, preserves the start height, and uses the shorter longitude interval across the date line.
- `getInclinedRectangle(start, end, offset, ellipsoid?)` builds orthogonal corners from a local 3D base and lateral projection without mutating inputs. It is local planar geometry; Earth curvature changes corner heights over large areas.
- Neither repeats the first corner. Use `[...corners, corners[0]]` to display a closed outline.
- Non-finite coordinates, coincident base points, and zero width are rejected.

## Examples and final entities

The circle, rectangle, and polygon demos are independent HTML pages with start and finish actions. They log results and retain final graphics. A polygon needs three points to finish; circles and rectangles complete after two clicks. Finishing an incomplete two-point task cancels it. Leaving a page destroys its globe.

Final entities live in a separate `CustomDataSource`, so cancelling a later task does not erase them.

```ts
import { EntityFactory, type EntityAreaOptions, type EntityLineOptions } from 'geoearth-sdk'
import { CustomDataSource } from 'cesium'
const results = new CustomDataSource('draw-results')
await earth.viewer.dataSources.add(results)
const circle = await earth.tools.draw.drawCircle()
results.entities.add(EntityFactory.createCircle(circle.center, circle.radius))
const corners = await earth.tools.draw.drawRectangle()
results.entities.add(EntityFactory.createPolygon(corners))
```

Default `Cartesian3` coordinates can be passed directly to the factory; browser scripts use `GeoEarth.EntityFactory`. `createCircle` and `createPolygon` default to ground clamping. Set `{ clampToGround: false }` to preserve input heights, with `fillColor`, `outlineColor`, and `width` for styling. `createCircle` creates a plain disk without a vertical connecting line; `createHeightEllipse` retains its separate purpose.
