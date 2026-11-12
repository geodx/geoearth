<div align="center">
<img src="docs/images/tech-globe-sm.webp" width="320" height="299" alt="GeoEarth globe" />
<br />
<a href="./LICENSE"><img src="https://img.shields.io/github/license/geodx/geoearth" alt="Apache License" /></a>
<h1>GeoEarth</h1>
<strong>A TypeScript 3D globe SDK built on Cesium.</strong>
<p>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/Cesium-6CAD45?style=flat-square" alt="Cesium" />
<img src="https://img.shields.io/badge/ESM%20%2B%20IIFE-0EA5E9?style=flat-square" alt="ESM and IIFE" />
<img src="https://img.shields.io/badge/status-in%20development-F59E0B?style=flat-square" alt="In development" />
</p>
<p><a href="./README.md">English</a> | <a href="./README.zh-CN.md">简体中文</a></p>
<p><a href="https://geoearth.dev">Website</a> · <a href="https://geoearth.dev/docs/getting-started">Documentation</a> · <a href="https://demo.geoearth.dev">Examples</a></p>
</div>

GeoEarth provides globe initialization, resource management, interaction tools, and reusable widgets through ESM and browser IIFE builds. Its example workbench lets you edit and run independent HTML scenes.

> Actively developed. APIs and examples continue to evolve.

## Features

- **Globe and camera:** initialization, opening flights, and view configuration.
- **Resources:** imagery, terrain, models, 3D Tiles, GeoJSON, and POIs.
- **Interaction:** drawing, measurements, camera/mouse events, picking, highlighting, and overview widgets.
- **Example workbench:** searchable directory, code editing, run/reset actions, dark/light themes, and Chinese/English UI.
- **TypeScript:** exported declarations for editor completion and development.

## Local development

Requires Node.js 22.17+ and npm. From the repository root:

```bash
npm install
npm run dev
```

This builds the SDK, then starts the example workbench at the URL printed in the terminal.

Examples load `/sdk/cesium/Cesium.js`, followed by `/sdk/geoearth.js`. The development server maps `/sdk` to the SDK build directory. After SDK changes, run `npm run build:iife` and rerun or refresh the example. Workbench Vue code supports hot module replacement.

## Integration

Both integration methods create a globe with `new GeoEarth('container')`. Give the container explicit width and height.

### ESM / Vite

Install `geoearth-sdk` and `cesium`, then add the resource plugin to vite.config.ts, keeping existing framework plugins:

```ts
import { defineConfig } from 'vite'
import { geoEarth } from 'geoearth-sdk/vite'

export default defineConfig({
  plugins: [geoEarth()],
})
```

After the container mounts:

```ts
import { GeoEarth } from 'geoearth-sdk'
import 'geoearth-sdk/style.css'

const earth = new GeoEarth('container')
await earth.onReady()
```

The plugin handles Cesium resource paths, asset copying, and widget styles.

### HTML

Deploy all contents of packages/core/dist under `/sdk`, and serve the page over HTTP:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>GeoEarth example</title>
  </head>
  <body>
    <div id="container" style="width: 100%; height: 100vh"></div>
    <script>
      window.CESIUM_BASE_URL = '/sdk/cesium/'
    </script>
    <script src="/sdk/cesium/Cesium.js"></script>
    <script src="/sdk/geoearth.js"></script>
    <script>
      const earth = new GeoEarth('container')
      earth.onReady().catch(console.error)
    </script>
  </body>
</html>
```

geoearth.js uses the previously loaded global Cesium rather than bundling another copy, and loads its own styles. Builds copy the installed Cesium.js and static assets to dist/cesium. Preserve geoearth.css, assets, and cesium alongside the script. Load the two scripts in order without async. Native APIs such as Cesium.Cartesian3 remain available to the page.

Call `earth.destroy()` when the page or component no longer needs the globe. Use earth.interaction for object picking, highlighting, and properties; see [Object interaction](docs/en/interaction.md).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build the SDK and start the example workbench |
| `npm run build` | Build ESM, IIFE, styles, and declarations |
| `npm run build:iife` | Build browser IIFE output only |
| `npm run build:example` | Build the SDK and demo site |
| `npm run dev:site` | Start the homepage/documentation site |
| `npm run build:site` | Type-check and build the homepage/documentation site |
| `npm run typecheck` | Check SDK TypeScript types |
| `npm run pack:geoearth` | Build and preview npm package contents without creating a tarball |

SDK output is packages/core/dist. Demo output is examples/vue-demo/dist, including its sdk directory.

## npm publishing

The public package is geoearth-sdk in packages/core. The root workspace stays private. See the [SDK README](packages/core/README.md) for package usage. From the root:

```bash
npm run typecheck
npm run pack:geoearth
npm pack -w packages/core
```

npm pack and npm publish rebuild through prepack. Before publishing, install the generated geoearth-sdk-<version>.tgz in a separate project and verify type checking, builds, and browser behavior. The filename uses the actual package version.

For manual publishing, use an account with package publishing permissions:

```bash
npm login --registry=https://registry.npmjs.org/
npm publish -w packages/core --access public --registry=https://registry.npmjs.org/
```

npm rejected the name geoearth as too similar to geo-earth; the package uses geoearth-sdk. A registry 404 does not guarantee a name can be registered. Increase the package version and synchronize the lockfile for each release; published name/version pairs cannot be republished.

## Website and deployment

Homepage and documentation live together in docs, independently of the demo workbench:

```bash
npm run dev:site
npm run build:site
```

Connect two Cloudflare Pages projects to this repository. Use main as the production branch, leave the root directory at the repository root, and use the Node version from .node-version:

| Site | Custom domain | Build command | Output directory |
| --- | --- | --- | --- |
| Homepage and docs | geoearth.dev | `npm run build:site` | docs/dist |
| Examples | demo.geoearth.dev | `npm run build:example` | examples/vue-demo/dist |

With Git integration enabled, pushes to the production branch trigger deployment. The website links to https://demo.geoearth.dev by default; override VITE_DEMO_URL at build time if needed. Each site keeps its own icons in its public directory.

### Languages

README.md is English; README.zh-CN.md is Chinese. On a first visit, the website reads the browser's preferred language: Chinese locales use Simplified Chinese; other languages use English. The header language selector persists a manual choice in localStorage. `?lang=en` and `?lang=zh-CN` provide explicit overrides.

Chinese feature documents stay in docs/*.md; English versions live in docs/en/*.md. UI translations live in docs/src/locales. Keep both language versions synchronized when changing an API.

## Repository layout

```text
geoearth/
├─ packages/core/           SDK package
│  ├─ src/ts/              TypeScript source
│  ├─ src/assets/          SDK assets
│  ├─ src/styles/          Styles
│  ├─ vite.config.ts       ESM build
│  └─ vite.iife.config.ts  Browser IIFE build
├─ docs/                   Homepage and documentation
│  ├─ src/                Pages, navigation, and UI translations
│  ├─ public/             Images, icons, and static assets
│  ├─ en/                 English feature documentation
│  └─ *.md                Chinese feature documentation
└─ examples/vue-demo/       Example workbench
   ├─ public/demos/        Independent HTML examples
   └─ src/                 Layout, components, pages, and translations
```

See the [workbench README](examples/vue-demo/README.md) for development and adding examples.

## Feedback and license

Report problems and suggestions through [Issues](https://github.com/geodx/geoearth/issues). See [LICENSE](LICENSE) for license terms.
