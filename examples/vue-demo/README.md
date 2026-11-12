# GeoEarth example workbench

[English](./README.md) | [简体中文](./README.zh-CN.md)

Vue provides the example directory, code editor, and page layout. Each example is an independent HTML document loading `/sdk/cesium/Cesium.js` before `/sdk/geoearth.js`. The page and SDK share one Cesium instance.

## Development and builds

Run from the repository root:

- `npm run dev`: build the SDK, then start the demo development server.
- `npm run build:iife`: regenerate browser output after SDK changes, then rerun or refresh the example.
- `npm run build:example`: build the SDK and demo site into examples/vue-demo/dist.

Development maps `/sdk` to packages/core/dist; production copies the SDK into dist/sdk. Preserve root-relative access to both scripts and their accompanying resources.

Set the resource path before loading Cesium:

```html
<script>
  window.CESIUM_BASE_URL = '/sdk/cesium/';
</script>
<script src="/sdk/cesium/Cesium.js"></script>
<script src="/sdk/geoearth.js"></script>
```

Do not add async to either script. Examples can use global Cesium directly. Vue workbench code supports Vite HMR; SDK code uses built output and does not hot-reload from source.

The initialization example loads lil-gui 0.21.0 from `/demo-assets/lil-gui.umd.min.js`. Script and license files live directly in public/demo-assets and need no npm dependency or dedicated plugin. Shared panels use public/demo-common/panel.css. Preserve demo-assets and demo-common during deployment.

## File responsibilities

```text
public/demos/             Independent HTML examples, copied unchanged
public/demo-assets/       Models, GeoJSON, images, scripts, attribution
public/demo-common/       Shared panel styles and page resources
src/
  App.vue                Shared state and Element Plus language
  layouts/
    WorkbenchLayout.vue  Header, icon sidebar, and page container
  views/
    Playground.vue       Example selection, source loading, run/reset
  components/
    directory/           Navigation, search, and selection
    playground/          Editor, preview, and editor settings
    ResizablePanels.vue  Resizable split panels
  composables/
    useWorkbench.ts      Workbench settings and panel state
  demos/
    registry.ts          Directory tree and lookup indexes
  locales/               Translations and language settings
  router/                Routes
  style.css              Global themes, base styles, shared overlays
```

Add HTML under public/demos, then register its path and translation keys in src/demos/registry.ts. Open `/demos/...` directly to run an example without the workbench.

## Asset conventions

- Group demos by capability; use lowercase kebab-case page names, such as resources/gltf-model.html.
- demo-assets contains static data, currently grouped by formats such as geojson and glb. Keep existing GLB paths. For future .gltf models with .bin and textures, use models/<model-name>/ to retain relative dependencies together.
- Prefer lowercase kebab-case for new first-party assets. Preserve existing third-party names to avoid unnecessary path changes. Keep model origins and licenses alongside their files.
- Put reusable HTML/CSS/JS in demo-common; small styles used by one example can remain inline. Existing third-party scripts can stay in place; consider demo-assets/vendor/ if their number grows.
- `/sdk` is mapped/copied from SDK builds; do not maintain another copy under public. Keep favicon.svg at the public root.

Switching the directory/code panels changes visibility only. Edited code runs after clicking Run. Reset restores and reruns the current example's original source.
