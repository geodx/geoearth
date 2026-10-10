export interface DemoItem {
  id: string;
  title: string;
  path: string;
  description?: string;
}

export interface DemoGroup {
  id: string;
  title: string;
  children: DemoNode[];
}

export type DemoNode = DemoItem | DemoGroup;

export const demoTree: DemoNode[] = [
  {
    "id": "group-basics",
    "title": "groups.basics",
    "children": [
      {
        "id": "basic",
        "title": "demos.basic",
        "description": "demos.basicDescription",
        "path": "demos/basic/create-earth.html"
      },
      {
        "id": "config",
        "title": "demos.config",
        "description": "demos.configDescription",
        "path": "demos/basic/config.html"
      },
      {
        "id": "basic-initial-view",
        "title": "demos.basic-initial-view",
        "description": "demos.initialViewDescription",
        "path": "demos/basic/initial-view.html"
      },
      {
        "id": "basic-start-animation",
        "title": "demos.basic-start-animation",
        "description": "demos.startAnimationDescription",
        "path": "demos/basic/start-animation.html"
      },
      {
        "id": "lifecycle",
        "title": "demos.lifecycle",
        "description": "demos.lifecycleDescription",
        "path": "demos/basic/lifecycle.html"
      }
    ]
  },
  {
    "id": "group-events",
    "title": "groups.events",
    "children": [
      {
        "id": "events-mouse-events",
        "title": "demos.events-mouse-events",
        "description": "demos.mouseEventsDescription",
        "path": "demos/events/mouse-events.html"
      },
      {
        "id": "events-camera-events",
        "title": "demos.events-camera-events",
        "description": "demos.cameraEventsDescription",
        "path": "demos/events/camera-events.html"
      },
      {
        "id": "events-resource-events",
        "title": "demos.events-resource-events",
        "description": "demos.resourceEventsDescription",
        "path": "demos/events/resource-events.html"
      },
      {
        "id": "events-picking-highlight",
        "title": "demos.events-picking-highlight",
        "description": "demos.pickingHighlightDescription",
        "path": "demos/events/picking-highlight.html"
      }
    ]
  },
  {
    "id": "group-imagery",
    "title": "groups.imagery",
    "children": [
      {
        "id": "imagery-single-image",
        "title": "demos.imagery-single-image",
        "description": "demos.placeholderDescription",
        "path": "demos/imagery/single-image.html"
      },
      {
        "id": "imagery-xyz",
        "title": "demos.imagery-xyz",
        "description": "demos.placeholderDescription",
        "path": "demos/imagery/xyz.html"
      },
      {
        "id": "imagery-wms",
        "title": "demos.imagery-wms",
        "description": "demos.placeholderDescription",
        "path": "demos/imagery/wms.html"
      },
      {
        "id": "imagery-wmts",
        "title": "demos.imagery-wmts",
        "description": "demos.placeholderDescription",
        "path": "demos/imagery/wmts.html"
      },
      {
        "id": "imagery-tms",
        "title": "demos.imagery-tms",
        "description": "demos.placeholderDescription",
        "path": "demos/imagery/tms.html"
      },
      {
        "id": "imagery-arcgis",
        "title": "demos.imagery-arcgis",
        "description": "demos.placeholderDescription",
        "path": "demos/imagery/arcgis.html"
      },
      {
        "id": "imagery-visibility-opacity",
        "title": "demos.imagery-visibility-opacity",
        "description": "demos.placeholderDescription",
        "path": "demos/imagery/visibility-opacity.html"
      },
      {
        "id": "imagery-ordering",
        "title": "demos.imagery-ordering",
        "description": "demos.placeholderDescription",
        "path": "demos/imagery/ordering.html"
      },
      {
        "id": "imagery-basemap-switch",
        "title": "demos.imagery-basemap-switch",
        "description": "demos.placeholderDescription",
        "path": "demos/imagery/basemap-switch.html"
      }
    ]
  },
  {
    "id": "group-terrain",
    "title": "groups.terrain",
    "children": [
      {
        "id": "terrain-load-switch",
        "title": "demos.terrain-load-switch",
        "description": "demos.placeholderDescription",
        "path": "demos/terrain/load-switch.html"
      },
      {
        "id": "terrain-visibility",
        "title": "demos.terrain-visibility",
        "description": "demos.placeholderDescription",
        "path": "demos/terrain/visibility.html"
      },
      {
        "id": "terrain-exaggeration",
        "title": "demos.terrain-exaggeration",
        "description": "demos.placeholderDescription",
        "path": "demos/terrain/exaggeration.html"
      },
      {
        "id": "terrain-sampling",
        "title": "demos.terrain-sampling",
        "description": "demos.placeholderDescription",
        "path": "demos/terrain/sampling.html"
      }
    ]
  },
  {
    "id": "group-data",
    "title": "groups.data",
    "children": [
      {
        "id": "data-geojson",
        "title": "demos.data-geojson",
        "description": "demos.placeholderDescription",
        "path": "demos/data/geojson.html"
      },
      {
        "id": "data-gltf-model",
        "title": "demos.data-gltf-model",
        "description": "demos.placeholderDescription",
        "path": "demos/data/gltf-model.html"
      },
      {
        "id": "data-tileset",
        "title": "demos.data-tileset",
        "description": "demos.placeholderDescription",
        "path": "demos/data/tileset.html"
      },
      {
        "id": "data-poi",
        "title": "demos.data-poi",
        "description": "demos.placeholderDescription",
        "path": "demos/data/poi.html"
      },
      {
        "id": "data-locate-unload",
        "title": "demos.data-locate-unload",
        "description": "demos.placeholderDescription",
        "path": "demos/data/locate-unload.html"
      }
    ]
  },
  {
    "id": "group-draw",
    "title": "groups.draw",
    "children": [
      {
        "id": "draw-point",
        "title": "demos.draw-point",
        "description": "demos.placeholderDescription",
        "path": "demos/draw/point.html"
      },
      {
        "id": "draw-polyline",
        "title": "demos.draw-polyline",
        "description": "demos.placeholderDescription",
        "path": "demos/draw/polyline.html"
      },
      {
        "id": "draw-polygon",
        "title": "demos.draw-polygon",
        "description": "demos.placeholderDescription",
        "path": "demos/draw/polygon.html"
      },
      {
        "id": "draw-rectangle",
        "title": "demos.draw-rectangle",
        "description": "demos.placeholderDescription",
        "path": "demos/draw/rectangle.html"
      },
      {
        "id": "draw-circle",
        "title": "demos.draw-circle",
        "description": "demos.placeholderDescription",
        "path": "demos/draw/circle.html"
      },
      {
        "id": "draw-result-management",
        "title": "demos.draw-result-management",
        "description": "demos.placeholderDescription",
        "path": "demos/draw/result-management.html"
      },
      {
        "id": "draw-editing",
        "title": "demos.draw-editing",
        "description": "demos.placeholderDescription",
        "path": "demos/draw/editing.html"
      },
      {
        "id": "draw-import-export",
        "title": "demos.draw-import-export",
        "description": "demos.placeholderDescription",
        "path": "demos/draw/import-export.html"
      }
    ]
  },
  {
    "id": "group-measure",
    "title": "groups.measure",
    "children": [
      {
        "id": "measure-point-height",
        "title": "demos.measure-point-height",
        "description": "demos.placeholderDescription",
        "path": "demos/measure/point-height.html"
      },
      {
        "id": "measure-space-distance",
        "title": "demos.measure-space-distance",
        "description": "demos.placeholderDescription",
        "path": "demos/measure/space-distance.html"
      },
      {
        "id": "measure-ground-distance",
        "title": "demos.measure-ground-distance",
        "description": "demos.placeholderDescription",
        "path": "demos/measure/ground-distance.html"
      },
      {
        "id": "measure-area",
        "title": "demos.measure-area",
        "description": "demos.placeholderDescription",
        "path": "demos/measure/area.html"
      },
      {
        "id": "measure-height-difference",
        "title": "demos.measure-height-difference",
        "description": "demos.placeholderDescription",
        "path": "demos/measure/height-difference.html"
      },
      {
        "id": "measure-triangle",
        "title": "demos.measure-triangle",
        "description": "demos.placeholderDescription",
        "path": "demos/measure/triangle.html"
      },
      {
        "id": "measure-result-management",
        "title": "demos.measure-result-management",
        "description": "demos.placeholderDescription",
        "path": "demos/measure/result-management.html"
      }
    ]
  },
  {
    "id": "group-camera",
    "title": "groups.camera",
    "children": [
      {
        "id": "camera-set-view",
        "title": "demos.camera-set-view",
        "description": "demos.placeholderDescription",
        "path": "demos/camera/set-view.html"
      },
      {
        "id": "camera-fly-to",
        "title": "demos.camera-fly-to",
        "description": "demos.placeholderDescription",
        "path": "demos/camera/fly-to.html"
      },
      {
        "id": "camera-bookmarks",
        "title": "demos.camera-bookmarks",
        "description": "demos.placeholderDescription",
        "path": "demos/camera/bookmarks.html"
      },
      {
        "id": "camera-orbit",
        "title": "demos.camera-orbit",
        "description": "demos.placeholderDescription",
        "path": "demos/camera/orbit.html"
      },
      {
        "id": "camera-roaming",
        "title": "demos.camera-roaming",
        "description": "demos.placeholderDescription",
        "path": "demos/camera/roaming.html"
      }
    ]
  },
  {
    "id": "group-widgets",
    "title": "groups.widgets",
    "children": [
      {
        "id": "widgets-overview",
        "title": "demos.widgets-overview",
        "description": "demos.placeholderDescription",
        "path": "demos/widgets/overview.html"
      },
      {
        "id": "widgets-coordinate-status",
        "title": "demos.widgets-coordinate-status",
        "description": "demos.placeholderDescription",
        "path": "demos/widgets/coordinate-status.html"
      },
      {
        "id": "widgets-scale",
        "title": "demos.widgets-scale",
        "description": "demos.placeholderDescription",
        "path": "demos/widgets/scale.html"
      },
      {
        "id": "widgets-compass",
        "title": "demos.widgets-compass",
        "description": "demos.placeholderDescription",
        "path": "demos/widgets/compass.html"
      },
      {
        "id": "widgets-layer-control",
        "title": "demos.widgets-layer-control",
        "description": "demos.placeholderDescription",
        "path": "demos/widgets/layer-control.html"
      },
      {
        "id": "widgets-multi-view",
        "title": "demos.widgets-multi-view",
        "description": "demos.placeholderDescription",
        "path": "demos/widgets/multi-view.html"
      }
    ]
  },
  {
    "id": "group-visualization",
    "title": "groups.visualization",
    "children": [
      {
        "id": "visualization-point-line-polygon",
        "title": "demos.visualization-point-line-polygon",
        "description": "demos.placeholderDescription",
        "path": "demos/visualization/point-line-polygon.html"
      },
      {
        "id": "visualization-labels-icons",
        "title": "demos.visualization-labels-icons",
        "description": "demos.placeholderDescription",
        "path": "demos/visualization/labels-icons.html"
      },
      {
        "id": "visualization-dynamic-line",
        "title": "demos.visualization-dynamic-line",
        "description": "demos.placeholderDescription",
        "path": "demos/visualization/dynamic-line.html"
      },
      {
        "id": "visualization-trajectory",
        "title": "demos.visualization-trajectory",
        "description": "demos.placeholderDescription",
        "path": "demos/visualization/trajectory.html"
      },
      {
        "id": "visualization-clustering",
        "title": "demos.visualization-clustering",
        "description": "demos.placeholderDescription",
        "path": "demos/visualization/clustering.html"
      },
      {
        "id": "visualization-heatmap",
        "title": "demos.visualization-heatmap",
        "description": "demos.placeholderDescription",
        "path": "demos/visualization/heatmap.html"
      }
    ]
  },
  {
    "id": "group-analysis",
    "title": "groups.analysis",
    "children": [
      {
        "id": "analysis-imagery-swipe",
        "title": "demos.analysis-imagery-swipe",
        "description": "demos.placeholderDescription",
        "path": "demos/analysis/imagery-swipe.html"
      },
      {
        "id": "analysis-profile",
        "title": "demos.analysis-profile",
        "description": "demos.placeholderDescription",
        "path": "demos/analysis/profile.html"
      },
      {
        "id": "analysis-line-of-sight",
        "title": "demos.analysis-line-of-sight",
        "description": "demos.placeholderDescription",
        "path": "demos/analysis/line-of-sight.html"
      },
      {
        "id": "analysis-height-limit",
        "title": "demos.analysis-height-limit",
        "description": "demos.placeholderDescription",
        "path": "demos/analysis/height-limit.html"
      },
      {
        "id": "analysis-terrain-excavation",
        "title": "demos.analysis-terrain-excavation",
        "description": "demos.placeholderDescription",
        "path": "demos/analysis/terrain-excavation.html"
      }
    ]
  },
  {
    "id": "group-advanced",
    "title": "groups.advanced",
    "children": [
      {
        "id": "advanced-fps",
        "title": "demos.advanced-fps",
        "description": "demos.placeholderDescription",
        "path": "demos/advanced/fps.html"
      },
      {
        "id": "advanced-request-render",
        "title": "demos.advanced-request-render",
        "description": "demos.placeholderDescription",
        "path": "demos/advanced/request-render.html"
      },
      {
        "id": "advanced-many-objects",
        "title": "demos.advanced-many-objects",
        "description": "demos.placeholderDescription",
        "path": "demos/advanced/many-objects.html"
      },
      {
        "id": "advanced-multi-instance",
        "title": "demos.advanced-multi-instance",
        "description": "demos.placeholderDescription",
        "path": "demos/advanced/multi-instance.html"
      },
      {
        "id": "advanced-container-resize",
        "title": "demos.advanced-container-resize",
        "description": "demos.placeholderDescription",
        "path": "demos/advanced/container-resize.html"
      }
    ]
  }
];

// 目录使用树，按路由查找示例使用 Map
export const demoMap = new Map<string, DemoItem>();

function collectDemos(nodes: DemoNode[]) {
  for (const node of nodes) {
    if ("children" in node) {
      collectDemos(node.children);
    } else {
      demoMap.set(node.id, node);
    }
  }
}

collectDemos(demoTree);
