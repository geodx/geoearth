# GeoEarth

[English](./README.md) | [简体中文](./README.zh-CN.md)

A TypeScript 3D globe SDK built on Cesium, with globe initialization, camera controls, resource management, drawing, measurements, object interaction, visualization, and widgets.

The project is actively developed; APIs may change.

## Installation

```bash
npm install geoearth-sdk cesium
```

Supports Cesium `^1.147.0`, ESM, and TypeScript declarations. The following examples use Vite 7 / 8. Development requires Node.js 22.17+ or 24 LTS. The SDK runs in the browser; SSR applications should load and initialize it after client mounting.

Use Cesium 1.147.0 or a newer compatible version. Installing Cesium 1.146.0 independently can cause missing ESM exports through its floating internal dependencies.

## Vite integration

Add the resource plugin to your existing plugins array, keeping Vue, React, or other plugins:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { geoEarth } from 'geoearth-sdk/vite'

export default defineConfig({
  plugins: [geoEarth()],
})
```

The plugin configures Cesium resource paths, serves resources during development, copies Assets, Workers, Widgets, and ThirdParty for production, and injects widget styles. The default resource path is `/cesium`. For a subpath deployment such as `/app/`, use `geoEarth({ baseUrl: '/app/cesium' })` to match the deployed location.

Create a container with explicit dimensions:

```html
<div id="earth" style="width: 100%; height: 600px"></div>
```

Initialize after the container exists:

```ts
import { GeoEarth } from 'geoearth-sdk'
import 'geoearth-sdk/style.css'

const earth = new GeoEarth('earth')
await earth.onReady()

// When the page or component unmounts:
// earth.destroy()
```

The SDK uses its built-in global imagery by default. To use Cesium ion imagery, terrain, or other services, provide your own token with the required permissions:

```ts
const earth = new GeoEarth('earth', undefined, {
  ionAccessToken: 'YOUR_CESIUM_ION_TOKEN',
})
```

In Vue, initialize in onMounted and destroy in onBeforeUnmount. In React, initialize in an effect after the container mounts and destroy in its cleanup function.

Without Vite, configure Cesium static resources, `CESIUM_BASE_URL`, and `cesium/Build/Cesium/Widgets/widgets.css` yourself.

## Optional thematic modules

Import only the modules you need:

- `geoearth-sdk/thematic/echarts`: ECharts integration; additionally install `echarts@5.6.0`.
- `geoearth-sdk/thematic/mapv`: MapV visualization.
- `geoearth-sdk/thematic/heatmap`: Heatmaps.

```bash
npm install echarts@5.6.0
```

## Browser scripts

Copy the complete contents of the package's dist directory to your site's `/sdk` directory and serve over HTTP:

```html
<div id="earth" style="width: 100%; height: 600px"></div>
<script>
  window.CESIUM_BASE_URL = '/sdk/cesium/'
</script>
<script src="/sdk/cesium/Cesium.js"></script>
<script src="/sdk/geoearth.js"></script>
<script>
  const earth = new GeoEarth('earth')
  earth.onReady().catch(console.error)
</script>
```

Load scripts in order without async. Keep accompanying styles, textures, and Cesium resources; geoearth.js loads its accompanying styles automatically.

## Documentation and feedback

- [Website and documentation](https://geoearth.dev)
- [Source and integration guide](https://github.com/geodx/geoearth)
- [API and feature documentation](https://geoearth.dev/docs/getting-started)
- [Report an issue](https://github.com/geodx/geoearth/issues)

## License

GeoEarth is licensed under [Apache License 2.0](./LICENSE). See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and the bundled third-party license files for dependencies and attribution.
