# Camera control

Use `earth.camera` for camera operations. Longitude, latitude, heading, pitch, and roll are degrees; height and range are meters; duration is seconds. Omitted orientation defaults to north-up, looking straight down, without roll.

```ts
const completed = await earth.camera.flyTo({
  longitude: 106.55, latitude: 29.56, height: 3000,
  heading: 0, pitch: -45, duration: 2,
})
const saved = earth.camera.getView()
earth.camera.setView(saved)
```

| Method | Behavior |
| --- | --- |
| `flyTo(view)` | Fly to geographic coordinates and orientation |
| `setView(view)` | Set the view immediately |
| `flyToExtent(extent, duration = 2)` | Frame west/south/east/north bounds, including date-line crossings |
| `flyToTarget(target, options?)` | Frame a Cesium entity, data source, imagery layer, or 3D Tiles; options include duration, heading, pitch, and range |
| `cancelFlight()` | Cancel the current flight, including pending target-data waits |
| `getView()` | Return a saveable view accepted by setView/flyTo |
| `getHeight()` | Camera ellipsoid height, not above-ground height or map scale |
| `getCenter()` | Intersect the center ray with the globe/loaded terrain; undefined without an intersection; buildings excluded |
| `getExtent()` | Approximate visible ellipsoid rectangle, or undefined; west > east means a date-line crossing |
| `resetNorth()` | Keep position and pitch/roll; set heading to zero |
| `setTopView()` | Look down from above the current surface center; false without an intersection |
| `lockTopView(true/false)` | Set top view and disable mouse tilt; unlocking restores the original enableTilt |
| `reset(duration = 2)` | Return to the configured initial view |
| `globalView(duration = 2)` | Look down from 23 million meters above longitude 0, latitude 0 |

`flyTo`, `flyToExtent`, `flyToTarget`, `reset`, and `globalView` return `Promise<boolean>`: true on completion; false on cancellation, replacement, or an unlocatable target. Underlying errors reject. Invalid parameters synchronously throw `RangeError`. A duration of zero completes immediately.

New operations end the opening animation and cancel previous flights. Destruction also ends pending waits. Top-view locking limits mouse tilt only; programmatic orientation changes remain possible.

```ts
import { CameraEventType } from 'geoearth-sdk'
const remove = earth.event.camera.addEventListener(CameraEventType.FLY_CANCEL, () => {
  console.log('Flight cancelled')
})
// Call remove() to stop listening.
```

The manager emits `FLY_START`, successful `FLY_END`, and cancelled/failed `FLY_CANCEL`. Native `CHANGE`, `MOVE_START`, and `MOVE_END` remain unchanged. Resource-manager positioning shares this lifecycle. The opening animation has its own flow; direct Cesium calls do not emit SDK `FLY_START`.

## Migrating older APIs

Replace standalone `flyTo({ viewer, cameraEvent, ... })` with `earth.camera.flyTo(...)`. Replace removed `getCameraInfo`, `getCameraHeight`, `getViewCenter`, `getCameraRectangle`, `getCameraRectanglePoint`, and `CameraViewType` with `getView`, `getHeight`, `getCenter`, `getExtent`, and `CameraView` as appropriate. The old edge-sampled polygon and the new approximate rectangle are different geometries.

Path roaming has a separate controller. Keyboard roaming and orbit observation are not provided. Initialization and overview widgets still use their own Viewers' Cesium APIs internally.

## View bookmarks

`earth.camera.bookmarks` is implemented in `camera/bookmark/BookmarkManager.ts`. Bookmarks store views and optional thumbnails, not complete scenes or layer configurations. Storage is in memory by default; reimport after a page reload.

```ts
const bookmarks = earth.camera.bookmarks
const bookmark = await bookmarks.create('Chongqing')
await bookmarks.flyTo(bookmark.id)
bookmarks.save('views.json')
await bookmarks.load() // Invoke from a button; cancelling returns undefined.
```

`create(name, { thumbnail: false })` skips capture. Default thumbnails are 320 × 180; `width`, `height`, and `description` are configurable. Capture waits for the next postRender and reads that frame's image and view without requiring preserveDrawingBuffer. Incomplete layers appear as they are at capture time. Cross-origin canvas failures reject; destruction cleans up pending captures and file selection.

`get(id)` and `getAll()` return copies. `remove(id)` and `clear()` manage memory. Use `toJSON()` and `importJSON(json, replace = true)` with localStorage or a backend. `save()` and `load(file?, replace = true)` download/import files. Imports replace by default; false appends. Duplicate IDs are rejected and failed imports preserve the previous list.

JSON is `{ version: 1, bookmarks: [...] }`; each item has id, name, view, and optional image/description. Legacy VGE arrays are accepted, converting Cartesian cameraView positions and radian orientations to CameraView.

General file helpers in `utils/browser/files.ts` export `saveShareContent(content, fileName, mimeType?)` and `readFile({ file?, accept?, signal? })`. The former downloads a string or Blob rather than creating a share link. The latter reads UTF-8 text and returns fileName, fileType (MIME), and fileData. Cancelling selection returns undefined; read errors and AbortSignal cancellation reject. Browsers do not expose real local paths.

## Path roaming

`earth.camera.roaming` lazily creates a `PathRoaming` controller. It supports route collection, surface sampling, and model following without legacy external CZML templates, built-in model URLs, or UI dependencies.

```ts
const roaming = earth.camera.roaming
roaming.setPath([
  { longitude: 106.55, latitude: 29.56, height: 600 },
  { longitude: 106.553, latitude: 29.56, height: 600 },
  { longitude: 106.553, latitude: 29.563, height: 600 },
])
roaming.start({ speed: 10, view: 'thirdPerson' })
roaming.pause()
roaming.resume()
roaming.stop()
```

`setPath()` needs at least two distinct points, with degree angles and ellipsoid heights. Adjacent points interpolate along 3D straight lines at meters per second. Densify long routes to avoid lines passing through the Earth or terrain.

`start(options?)` restarts at the beginning. `pause()` retains progress and releases the camera; `resume()` continues. `stop()` cancels drawing/preparation and resets progress while retaining the route. `destroy()` releases entities and listeners and is called by globe destruction. `state` is idle, playing, paused, or completed; `progress` ranges from 0 to 1; `duration` is total seconds at normal speed.

| Option | Behavior |
| --- | --- |
| speed | Meters/second; default 10 |
| multiplier | Playback multiplier; default 1; update with setMultiplier |
| view | thirdPerson follow, firstPerson, or none (object only) |
| pitch / range | Third-person pitch in degrees / distance in meters; defaults -30 / 100 |
| eyeHeight | First-person height above route; default 1.7 meters |
| loop | Default false; nonmatching endpoints jump back to the start |
| showPath | Default true; update with setShowPath |
| model | Optional `{ uri, scale, minimumPixelSize }`; otherwise a point marker |

Switch views with methods such as `setView('firstPerson')`. Follow views take over mouse camera input, restoring its original state and reference frame on pause/completion/stop. Normal `earth.camera` positioning pauses roaming; resume afterward if needed. Only 3D is supported. Clear external `trackedEntity` before starting. Playback has independent progress and does not alter Viewer.clock or trackedEntity. Pausing does not restore the camera's starting position.

```ts
await roaming.drawPath(earth.tools.draw, {
  heightMode: 'surface', heightOffset: 2, sampleSpacing: 30,
})
await roaming.preparePath(points, { heightMode: 'terrain', heightOffset: 1 })
```

Drawing reuses the draw tool; right click completes, while cancellation or too few points rejects with `DrawCancelledError`. Preparation returns true on success or false when superseded.

`heightMode` supports absolute (retain input heights), terrain, and surface (default: scene surface with per-point terrain fallback). `heightOffset` is added per point. Default `sampleSpacing` is 30 meters and `maxSamples` is 4096. Sampling precedes interpolation. There is no collision avoidance or automatic smoothing of corners, so paths can pass through buildings.

Failed preparation keeps the previous route. Stop, setPath, and destroy invalidate old results without cancelling Cesium network requests. Unavailable terrain heights cause errors rather than becoming zero. Ellipsoid terrain returns zero; unavailable model sampling falls back to terrain.

Legacy startRoaming/stopRoaming/roamingPath/roamSpeed/runSpeed map to start, pause or stop, setPath, start({ speed }), and setMultiplier. Supply people, vehicles, or aircraft through model.uri; the SDK includes no static model assets and does not depend on buildCZML.

### Demo models

The demo offers a person, truck, off-road vehicle, and aircraft in `examples/vue-demo/public/demo-assets/model/`, copied from matching legacy CesiumEarth assets. CesiumMilkTruck is the smaller default; GroundVehicle is optional. Assets belong to the demo site and are excluded from the npm SDK.

Each model has suitable speed, scale, and viewing distance. Ground models sample terrain; the aircraft flies 120 meters above terrain. Restart after switching models. Skeleton, wheel, and propeller animations are not synchronized with roaming progress; original orientation and origins still require scene verification.
