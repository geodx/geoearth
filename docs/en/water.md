# Waves, reflections, and shallow water

Browser scripts and npm/ESM use `earth.effects.addWater(options)`. A standalone Cesium Viewer can use `new WaterEffect(viewer, options)`. Start `npm run dev` and open the water example.

```ts
const water = earth.effects.addWater({
  hierarchy: [
    { longitude: 110, latitude: 30 }, { longitude: 110.01, latitude: 30 },
    { longitude: 110.01, latitude: 30.01 }, { longitude: 110, latitude: 30.01 },
  ],
  height: 25,
  color: new Cesium.Color(0.035, 0.25, 0.30, 0.92),
  reflection: true, reflectionSize: 512,
  animationSpeed: 1, amplitude: 0.6,
  meshSize: 8, waveHeight: 0.35, waveSteepness: 0.35,
  shoreFadeDistance: 12,
  refraction: true, refractionSize: 512, refractionStrength: 0.65,
  absorption: new Cesium.Cartesian3(0.28, 0.09, 0.045),
  foam: true, foamWidth: 1.2, foamOpacity: 0.7,
  caustics: true, causticsIntensity: 2, causticsMaxDepth: 12,
  distortionScale: 12, skyReflection: true,
  waveLength: 80, waveDirection: 25, rippleStrength: 0.25,
  roughness: 0.18, scattering: 0.65,
})
water.update({ reflection: false })
water.update({ animationSpeed: 0 }) // Pause waves; camera movements still update reflections.
water.show = false
water.destroy()
```

`hierarchy` accepts a coordinate array or Cesium.PolygonHierarchy with holes. GeoEarth-created effects are destroyed with the globe; standalone Viewer users must call destroy(). Repeated destruction is safe.

## Rendering

Each frame mirrors the current camera across the center tangent plane, collects object color commands again, clips below-water geometry, and renders into a separate color texture with a 24-bit depth/stencil attachment. The current scene skyBox and skyAtmosphere follow its date and atmosphere settings. Terrain reuses ready commands from the previous main frame, avoiding two cameras changing Cesium's globe-quadtree tile selection in one frame.

The water image is assembled in this order:

1. **Geometric waves.** Cesium's concave polygon/hole triangulation is retained. Recursive longest-edge subdivision produces a shared-vertex mesh. Three Gerstner waves displace vertices horizontally and vertically and supply analytic normals. Distance to outer and island boundaries smoothly reduces displacement near shore. This does not simulate rising water or moving wet shorelines.
2. **Underwater color and depth.** All water surfaces are hidden while underwater objects render from the main camera into color and sampleable 24-bit depth attachments. Positions are reconstructed from each nearest depth texel's center ray and that pass's projection matrix. This avoids oblique-view striping from mismatched depth/rays and yields vertical depth and optical path length. It does not mix in the main scene's multi-frustum logarithmic depth. Missing bottoms fall back to deep-water scattering without foam.
3. **Refraction and absorption.** An air/water index ratio of 1/1.333 estimates refracted direction. An initial depth estimate locates the underwater color sample. Out-of-bounds and above-water samples fall back; offsets fade near screen edges. RGB transmission is `exp(-absorption * opticalPath)`. Red typically attenuates faster, with deep water approaching the scattering color.
4. **Shore foam.** Actual depth at the unrefracted position forms a shallow-water mask, modulated by meter-scale noise and time-varying bands. Foam appears near shores, islands, and shallow rocks. Polygon edges without a shallow bottom do not generate an artificial white outline.

Shading uses procedural normals: analytic Gerstner normals plus four directional fine-wave groups and four micro-ripple groups. Fine-wave height functions use gravity-wave dispersion, with directions distributed around waveDirection. Smooth value noise perturbs phase within individual bands, avoiding a regular highlight grid from shared large-scale phase. Normals include noise gradients through the chain rule; noise is not used directly as a normal. Pixel-footprint filtering and distance attenuation reduce unresolved high frequencies and flicker. Fine waves affect shading, not mesh silhouettes.

Geometric and fine waves distort reflection sampling. Fresnel blends reflection with scattered water color. Solar direction uses Cesium's `czm_sunDirectionWC` and follows viewer.clock.currentTime, with solar altitude controlling day/night attenuation and an approximate light color. GGX specular and roughness control highlights. Water surfaces hide from both offscreen passes to prevent recursion. show=false stops that surface's offscreen drawing. animationSpeed=0 freezes wave time while camera/solar changes can still update reflections.

### Underwater caustics

Caustics reuse the same Gerstner/fine-wave normals and real solar direction. Snell refraction traces three neighboring rays to the actual receiver height; the projected area ratio estimates light concentration. Caustics composite into underwater color before absorption and Fresnel blending, retaining the sampled bottom color. They share wave time and pause with the waves, without caustic images or extra framebuffer attachments.

Depth reconstruction retains accurate texel-center heights, while caustic illumination reconstructs continuous XY along the current pixel ray. This prevents highlights from locking to depth-texture grid points. Depth-texture resolution and meshSize are separate controls. Strength attenuates with solar altitude, optical absorption, depth limits, and pixel coverage. No concentration is generated without a bottom, on a flat wave surface, or below the solar horizon.

This is a real-time, single-receiver-height projection approximation. Entry points use planar refraction and shore distance uses a local gradient. It lacks full photon transport, temporal caustic accumulation, and solar occlusion tests. Complex walls, slopes, layered geometry, and underwater shadows from trees/buildings have limitations. Caustics affect this surface's underwater view only, not main-scene objects when water is hidden or the camera is underwater.

## Parameters

| Parameter | Meaning | Default |
| --- | --- | --- |
| meshSize | Construction-time maximum mesh edge length in meters, minimum 1 | 8 |
| waveHeight | Maximum geometric vertical amplitude in meters, 0–10; peak-to-trough at most twice this | 0.35 |
| waveSteepness | Horizontal displacement strength, 0–1 | 0.35 |
| shoreFadeDistance | Displacement fade distance near outer/island boundaries, meters | 12 |
| refraction | Underwater refraction and absorption | true |
| refractionSize | Construction-time underwater color/depth texture side, 64–2048 | reflectionSize |
| refractionStrength | Refraction offset multiplier, 0–1; zero retains depth absorption | 0.65 |
| absorption | Nonnegative RGB absorption per meter, Cartesian3 | (0.28, 0.09, 0.045) |
| foam | Depth-based foam, independent of refraction | true |
| foamWidth | Foam depth range in meters, not horizontal shore width | 1.2 |
| foamOpacity | Foam coverage strength, 0–1 | 0.7 |
| caustics | Real-time underwater caustics; normal display requires refraction | true |
| causticsIntensity | Concentration gain, 0–10; zero disables calculation | 2 |
| causticsMaxDepth | Maximum vertical depth in meters, fading over the latter half | 12 |
| debugView | surface / depth / refraction / foam / normals / caustics | surface |
| depthRange | Full-scale debug depth in meters: shallow yellow, deep blue, missing bottom black | 10 |
| frequency | Procedural fine-wave density, not mesh count; zero disables fine waves | 100 |
| animationSpeed | Wave time multiplier; zero pauses | 1 |
| amplitude | Procedural normal strength; zero retains geometric normals only | 1 |
| distortionScale | Reflection texture distortion | 12 |
| reflectionStrength | Fresnel reflection weight multiplier, 0–1 | 1 |
| reflectionSize | Fixed square reflection texture side, 64–2048 | 512 |
| specularIntensity | Solar specular intensity | 0.8 |
| waveLength | First geometric wavelength and procedural scale reference, meters | 80 |
| waveDirection | Direction in degrees relative to local east | 0 |
| rippleStrength | Near-field micro-ripple strength | 0.25 |
| roughness | Microfacet roughness, 0.03–1; highlight width and approximate reflection blur | 0.18 |
| scattering | Water-color scattering strength | 0.65 |
| skyReflection | Include the scene skybox and atmosphere | true |
| sunColor | Solar tint; direction still uses the actual sun | Color.WHITE |

`waveHeight=0` disables geometric waves; `amplitude=0` disables only procedural fine waves. The three geometric wavelengths are waveLength times 1, 0.53, and 0.27. Prefer `meshSize <= waveLength * 0.1`; shorter waves require denser geometry. Construction rejects more than 150000 vertices: increase meshSize or split the water area.

After successful refraction capture, bottom color is already composited in the shader. The surface uses the opaque pass with output alpha 1; color.alpha controls the post-absorption water/underwater color blend to avoid double-blend ghosting. Disabling refraction restores transparent water-color blending. Foam width follows actual depth, so slope determines horizontal coverage. Debug depth, refraction, and foam views help check whether a scene has a bottom and shallows.

Prefer frequency=100 and use waveLength to control scale. The procedural reference scale is `waveLength * 100 / frequency`. Fine wavelengths use 0.19, 0.137, 0.097, 0.067 of that scale; micro-ripples use 0.035, 0.024, 0.016, 0.011. rippleStrength controls micro-ripples; amplitude controls all fine-wave normals.

The normalMap option was removed. WaterEffect loads no waterNormals.jpg or other normal image and has no texture fallback. Remove old normalMap settings and retune amplitude as a procedural slope multiplier. Reflection/color/depth still use offscreen textures. The normals debug view shows the final local normal encoded as RGB.

`update()` accepts WaterStyleOptions. Boundary, height, meshSize, and texture dimensions require recreation. Legacy material.uniforms.baseWaterColor fields remain, but update() is preferred to request redraws. animationSpeed now uses elapsed real time rather than Cesium Water's per-frame multiplier; retune older settings.

## Camera updates and limits

Reflection updates in every scene.preRender using the current camera, independent of camera.changed, SDK CHANGE throttling, or camera.percentageChanged. Zoom depth picking can clear Cesium frame flags before main rendering; the pass maintains its own render flags and 3D Tiles RENDER state to avoid intermittent reflection loss. Camera movement/zoom still updates paused water. Planar reflection stops when the camera is below the water.

- Intended for local planar lakes and ponds. Center height is ellipsoid height. Large surfaces do not follow Earth curvature and are unsuitable for ocean scale.
- Reflection and underwater capture require an above-water 3D perspective camera. Other modes fall back to water/environment color and waves.
- Reflection supports ordinary opaque objects, models, 3D Tiles, and globe color commands. Transparent objects are distance-sorted without Cesium OIT. Classification, postprocessing, shadows, screen-space effects, and mutual water reflections are outside this pass.
- Terrain reflections cover tiles ready in the main view. Initial loading, rapid turns, and offscreen mountains may lack detail. Sky/object color textures are not a full HDR image-based lighting pipeline.
- Refraction is a single current-view projection. Offscreen bottoms and multiple refractions cannot be recovered. There is no underwater camera rendering, fluid solver, breaking waves, or foam particles. Reflection blur uses neighboring samples; transparent multilayer volumes do not have precise underwater depth intersection.
- Underwater capture needs depth-texture support; otherwise water color and reflection remain available.
- Cesium has no public offscreen scene API. Internal adaptation is centralized in ReflectionPass.ts; waterVertexShader.ts also adapts Fabric uniform mapping. The adapter was developed against Cesium 1.146; revalidate upgrades. Each visible surface normally adds reflection and underwater draws. Caustics add wave/refraction calculations; compare costs with the native FPS panel on the target GPU. Disabling reflection stops its pass. Disabling both refraction and foam with surface/normals debug view stops underwater capture. Texture sizes remain fixed across window resizing.

## Demo scene

The example is near Lake Annecy, France (6.17°E, 45.87°N), using addBingImagery() and addWorldTerrain(). It uses Cesium's default token; SDK consumers should configure their own ionAccessToken. A previous terrain sample was approximately 493.55 meters ellipsoid height; the illustrative ground is 497 meters. Shores and facilities are procedural demonstrations, not surveyed geography. Terrain camera collision adjustment is disabled to retain the fixed view while coarse tiles load.

The scene includes shores, an island, underwater rocks, buildings, trees, boardwalks, a dock, and a sailboat, with continuous sandy slopes along outer/island shores. Controls cover color/opacity, reflection, roughness, scattering, wave scale/direction/strength/speed, procedural density/normals, geometric amplitude/steepness, shore fade, refraction, RGB absorption, foam, depth, and caustics. A shallow-caustics view focuses on rocks; a caustic-illumination debug view isolates lighting.

`earth.tools.fps.show()` displays the native FPS/MS panel; show()/hide() control it. With paused waves, on-demand rendering may report N/A or throttled. Date/time uses UTC with live solar altitude. A light-following view faces solar reflection. The reproducible default is 2026-06-21 at 15:00 UTC, rather than the computer's current time.

Online resource failures retain the local basemap and water test scene. Gerstner mesh waves, depth capture, absorption, and foam are implemented for Cesium; fine-wave normals use GeoEarth procedural wave/noise derivatives. Fresnel and reflection distortion retain adaptations from Three.js Water. Attribution and licenses are preserved in packages/core/THIRD_PARTY_NOTICES.md.
