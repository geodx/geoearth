# Line of sight

```ts
const controller = new AbortController()
const [observer, target] = await earth.tools.draw.drawLine()
const result = await earth.analysis.computeLineOfSight(observer, target, {
  source: 'surface', observerHeight: 2, targetHeight: 2,
  sampleSpacing: 20, signal: controller.signal,
})
console.log(result.visible, result.distance, result.obstruction)
```

Inputs accept Cartesian3 or objects with longitude, latitude, and height. Input heights are absolute ellipsoid heights. observerHeight and targetHeight add offsets along each position's ellipsoid normal, defaulting to zero meters. Distance is the 3D straight-line distance between endpoints.

| Option | Meaning |
| --- | --- |
| source | Default surface: terrain and scene objects. Terrain checks terrain only |
| sampleSpacing | Initial terrain spacing along the 3D sightline; default 30 meters |
| maxSamples | Initial sample cap, default 4096, minimum 3; spacing increases at the cap |
| terrainLevel | Optional explicit level from 0 to 30, useful for custom terrain |
| tolerance | Terrain penetration and scene-endpoint contact tolerance; default 0.1 meters |
| exclude | Entities, Primitives, or 3D Tiles features excluded from ray picks; exclude result lines/markers when rerunning |
| signal | Cancel the task; destroying GeoEarth also cancels it |

When visible is false, obstruction contains the first blocked position, distance from the observer, and source (terrain or scene). Scene obstructions include the Cesium-picked object. Results report actual sampleSpacing and terrainSource. Analytic ellipsoid intersection uses sampleSpacing zero.

Terrain checks retain Earth curvature. Ellipsoid ground uses analytic intersection; real terrain is sampled along the 3D sightline. The first penetrated interval is refined by up to 12 bisections. Terrain resolution, spacing, and sample limits affect accuracy; obstacles narrower than a sample interval may be missed.

Surface mode waits for Entity geometry updates, then ray-picks glTF, scene Primitives, and most-detailed 3D Tiles, ignoring intersections beyond the target. Independently loaded Models must be ready. This requires a 3D scene and depth textures. Cesium 1.146 marked pickFromRayMostDetailed private; SDK adaptation and availability checks are centralized in sceneIntersection.ts. Revalidate when upgrading Cesium. Picks use rendered geometry, including the picking behavior of transparent materials.

Unavailable heights, sampling failures, and terrain-provider changes during calculation cause errors. Cancellation immediately settles the returned Promise, though Cesium sampling and ray requests may continue. A standalone Viewer can use the exported `computeLineOfSight(viewer, observer, target, options)` with a signal.

The demo uses addWorldTerrain() and addBingImagery(), with mountain/building scenes, point selection, height offsets, cancellation, and clearing. Green shows the observer-to-first-obstruction segment; red shows the remainder.
