# Picking and highlighting

`earth.interaction` normalizes picks for Entity, 3D Tiles features, Model, and ordinary Primitive objects. Automatic interaction is disabled by default; manual APIs are immediately available.

```ts
import { GeoEarth, InteractionEventType } from 'geoearth-sdk'
const earth = new GeoEarth('earth', { infoBox: true, selectionIndicator: true })
await earth.onReady()
earth.interaction.enable({
  hover: true,
  select: true,
  hoverColor: '#67e8f9',
  selectColor: '#fbbf24',
  filter: result => result.type === 'entity' || result.type === 'feature',
})
earth.event.interaction.addEventListener(InteractionEventType.SELECT_CHANGE, ({ previous, current }) => {
  console.log('Selection changed', previous, current)
  if (current) console.log(current.object, current.properties)
})
```

The property panel and selection marker reuse Cesium widgets; enable them when constructing the Viewer. A pick filter continues searching behind rejected objects.

## API

| Method / property | Behavior |
| --- | --- |
| `enable(options?)` | Enable hover and click selection; subsequent calls update options |
| `disable()` | Disable automatic interaction, clear states, restore styles and the Viewer's original click handler |
| `pick(position)` | Return the first object matching the filter, or `undefined` |
| `drillPick(position, limit?)` | Return front-to-back results deduplicated by object identity, without applying the filter |
| `select(target)` / `clearSelection()` | Set/clear selection and update the native property panel |
| `highlight(target, color?)` / `clearHighlight()` | Set/clear manual highlighting without changing selection; default orange. The return value reports whether color actually changed |
| `clearHover()` | Clear hover and pending hover picks |
| `getProperties(target)` | Read current object properties again |
| `registerHighlightAdapter(adapter)` | Add an adapter with priority over built-in adapters; returns a removal function |
| `isEnabled`, `hovered`, `selected`, `highlighted` | Read-only state |

`position` is a `Cartesian2` in CSS pixels relative to the Cesium canvas, normally a screen event's `position` or `endPosition`. A `target` can be a `PickResult`, Entity, Cesium3DTileFeature, ModelFeature, Model, or a native `{ primitive, id? }` pick.

`PickResult` exposes `type`, `object`, `primitive`, `id`, `name`, `properties`, and optional screen `position`. Properties are a snapshot; call `getProperties()` for dynamic values. Entity and feature references retain the original objects.

## Events and state

`earth.event.interaction` uses the SDK's BaseEvent with `addEventListener`, `removeEventListener`, and `removeAllEventListeners`. Globe destruction cleans up internal listeners.

- `HOVER_CHANGE`: the hovered object changed.
- `SELECT_CHANGE`: selection changed, including empty clicks, property-panel closing, or object removal.
- `HIGHLIGHT_CHANGE`: the manually highlighted object changed.

Payloads are `{ type, previous, current }`. Repeating an operation on the same object does not emit again; clearing sets `current` to `undefined`. Highlight state and an adapter's ability to change color are separate; check the return value of `highlight()`.

Priority is **manual highlight > selection > hover**. Clearing a higher-priority state restores any lower-priority style still in effect. Clearing all states restores the original style. Entity restoration retains the original Property reference and dynamic materials/colors. If application code replaces a Property during highlighting, its replacement is retained.

Hover picks coalesce mouse movements per animation frame. Picking pauses during drawing/measurement point collection and resumes afterward. Removing an Entity, DataSource, Primitive collection member, or unloading a feature's tile clears related states. Features are not automatically selected again when a tile reloads.

Automatic interaction takes over the Viewer's default left-click selection and restores it on disable. Application ScreenEvent listeners and native double-click tracking remain available. Enabling interaction adopts any existing Viewer selection. Screen-picked features/models use a spatial pick for the native marker; a programmatically selected feature without a position displays properties only.

## Highlight adapters

Built-in adapters cover Entity points, billboards, labels, lines, polygons, and models; Cesium3DTileFeature/ModelFeature and Model colors; ready Primitive/GroundPrimitive instances with a color attribute; and native Billboard, Label, and PointPrimitive objects with writable colors. Entity lines and polygons temporarily use a solid material, restoring their original material afterward.

Custom shaders, special appearances, and Primitives without instance color attributes need a custom adapter. Picking and selection still work; `highlight()` returns `false` if no adapter can apply color.

```ts
const removeAdapter = earth.interaction.registerHighlightAdapter({
  supports: result => result.primitive === customObject,
  apply: (_result, color) => {
    const original = customObject.tint
    customObject.tint = color
    return () => { customObject.tint = original }
  },
})
// Call removeAdapter() when no longer needed.
```

Removing an adapter first restores its styles, then reapplies built-in adapters. The property panel uses an Entity's existing `description`, or temporarily displays a properties table. Other objects use a temporary Entity. Generated property text is escaped.

Demo: `examples/vue-demo/public/demos/events/picking-highlight.html`.
