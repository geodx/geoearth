# ResourceTree

[English](./README.md) | [简体中文](./README.zh-CN.md)

An optional Wunderbaum 0.14.1 resource widget for browser scripts and npm. Mount it into a chosen container through `earth.widgets.resourceTree`, available from WidgetManager and the main SDK entry.

## Behavior

- Builds a directory from config.getAllConfig() and loaded resources, tracking dynamic additions through resource events.
- defaultLoad belongs to the SDK initialization loader. Resource checkboxes reflect sources.isLoaded(); eye icons reflect actual instance visibility.
- Batch loading is sequential. Partial failures retain successful items and partial selection; busy trees prevent duplicate operations.
- Basemaps and terrain use single selection. A new basemap is created before hiding the old one. Existing basemap instances can be reused; failures preserve the previous selection.
- Loaded nodes support fly-to, imagery opacity, visibility, unloading, and base/overlay roles.
- Supports sorting within catalogs, moving across catalogs, and catalog sorting. Basemaps and terrain cannot move into business catalogs.
- Higher business imagery nodes render above lower ones; basemaps remain underneath. Reordering reuses instances.
- Supports search, expansion state, stable node updates, reopening, event cleanup, and preservation of original container content.
- Layout import/export is available. Automatic localStorage persistence requires storageKey; use a different key per globe.
- Move-up/down controls and catalog entry provide alternatives to dragging.

## API

```ts
await earth.onReady();
const tree = earth.widgets.resourceTree;
await tree.open({ container: 'tree', draggable: true, allowCrossCatalog: true });
tree.hide(); tree.show(); tree.close();
await tree.open({ container: 'tree' });
await tree.setLoaded(id, true);
await tree.setVisible(id, false);
await tree.setBaseImagery(id);
tree.setAlpha(id, 0.5);
tree.moveResource(id, 'Other layers', beforeId);
const state = tree.exportState();
tree.importState(state);
tree.resetState();
tree.destroy();
```

Public asynchronous operations reject on failure. UI operations display errors and call onError. Closing the tree does not unload globe resources.

## Data boundaries

Catalogs, order, and basemap-candidate roles are widget layout data. They do not modify initialization configuration or serialize service URLs, access tokens, Cesium objects, or runtime loading state. Persist to a server with onChange(state) or exportState().

ResourceManager currently has no complete resource catalog. The widget retains dynamic resources observed through loaded instances/events, allowing reloading after unload. Resources added and unloaded before creation or while closed cannot be reconstructed. A future unified catalog can be supplied through `getResources: () => earth.sources.getResources()` without changing the tree component.

Native imagery visibility/move events refresh tree state. Arbitrary cross-catalog imagery interleaving outside the tree does not rewrite its catalog layout. Tree drag ordering synchronizes with Cesium; ordinary model/POI directory order does not represent 3D occlusion order.

The widget does not add ResourceManager concurrency control or alter its asynchronous destruction. Loads started before closing may finish; reopening reads the current state.

## Validation

```powershell
npm run typecheck
npm run build
```

Demo: `http://localhost:5173/demos/resources/resource-tree.html`. It uses local imagery, GeoJSON, GLB, and POIs. Invalid image/terrain entries intentionally demonstrate failures.

## Styles

JavaScript and CSS import the npm-installed Wunderbaum directly without vendor copies. Its MIT attribution remains in source and distributed styles/SDK builds. Styles install on mounting and are removed when the last instance closes; no SDK style entry changes are needed.
