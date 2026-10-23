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
    "id": "group-resources",
    "title": "groups.resources",
    "children": [
      {
        "id": "resource-tree",
        "title": "demos.resource-tree",
        "description": "demos.resourceTreeDescription",
        "path": "demos/resources/resource-tree.html"
      },
      {
        "id": "imagery-single-image",
        "title": "demos.imagery-single-image",
        "description": "demos.singleImageDescription",
        "path": "demos/resources/single-image.html"
      },
      {
        "id": "imagery-xyz",
        "title": "demos.imagery-xyz",
        "description": "demos.xyzDescription",
        "path": "demos/resources/xyz.html"
      },
      {
        "id": "imagery-wms",
        "title": "demos.imagery-wms",
        "description": "demos.placeholderDescription",
        "path": "demos/resources/wms.html"
      },
      {
        "id": "imagery-wmts",
        "title": "demos.imagery-wmts",
        "description": "demos.placeholderDescription",
        "path": "demos/resources/wmts.html"
      },
      {
        "id": "imagery-tms",
        "title": "demos.imagery-tms",
        "description": "demos.placeholderDescription",
        "path": "demos/resources/tms.html"
      },
      {
        "id": "imagery-arcgis",
        "title": "demos.imagery-arcgis",
        "description": "demos.placeholderDescription",
        "path": "demos/resources/arcgis.html"
      },
      {
        "id": "terrain-online",
        "title": "demos.terrain-online",
        "description": "demos.placeholderDescription",
        "path": "demos/resources/online-terrain.html"
      },
      {
        "id": "terrain-custom",
        "title": "demos.terrain-custom",
        "description": "demos.placeholderDescription",
        "path": "demos/resources/custom-terrain.html"
      },
      {
        "id": "data-geojson",
        "title": "demos.data-geojson",
        "description": "demos.geojsonDescription",
        "path": "demos/resources/geojson.html"
      },
      {
        "id": "data-gltf-model",
        "title": "demos.data-gltf-model",
        "description": "demos.gltfModelDescription",
        "path": "demos/resources/gltf-model.html"
      },
      {
        "id": "data-tileset",
        "title": "demos.data-tileset",
        "description": "demos.tilesetDescription",
        "path": "demos/resources/tileset.html"
      },
      {
        "id": "data-poi",
        "title": "demos.data-poi",
        "description": "demos.poiDescription",
        "path": "demos/resources/poi.html"
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
        "description": "demos.drawPointDescription",
        "path": "demos/draw/point.html"
      },
      {
        "id": "draw-polyline",
        "title": "demos.draw-polyline",
        "description": "demos.drawPolylineDescription",
        "path": "demos/draw/polyline.html"
      },
      {
        "id": "draw-polygon",
        "title": "demos.draw-polygon",
        "description": "demos.drawPolygonDescription",
        "path": "demos/draw/polygon.html"
      },
      {
        "id": "draw-rectangle",
        "title": "demos.draw-rectangle",
        "description": "demos.drawRectangleDescription",
        "path": "demos/draw/rectangle.html"
      },
      {
        "id": "draw-circle",
        "title": "demos.draw-circle",
        "description": "demos.drawCircleDescription",
        "path": "demos/draw/circle.html"
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
        "description": "demos.measureDescription",
        "path": "demos/measure/point-height.html"
      },
      {
        "id": "measure-space-distance",
        "title": "demos.measure-space-distance",
        "description": "demos.measureDescription",
        "path": "demos/measure/space-distance.html"
      },
      {
        "id": "measure-ground-distance",
        "title": "demos.measure-ground-distance",
        "description": "demos.measureDescription",
        "path": "demos/measure/ground-distance.html"
      },
      {
        "id": "measure-area",
        "title": "demos.measure-area",
        "description": "demos.measureDescription",
        "path": "demos/measure/area.html"
      },
      {
        "id": "measure-height-difference",
        "title": "demos.measure-height-difference",
        "description": "demos.measureDescription",
        "path": "demos/measure/height-difference.html"
      },
      {
        "id": "measure-triangle",
        "title": "demos.measure-triangle",
        "description": "demos.measureDescription",
        "path": "demos/measure/triangle.html"
      },
      {
        "id": "measure-perimeter",
        "title": "demos.measure-perimeter",
        "description": "demos.measureDescription",
        "path": "demos/measure/perimeter.html"
      },
      {
        "id": "measure-angle",
        "title": "demos.measure-angle",
        "description": "demos.measureDescription",
        "path": "demos/measure/angle.html"
      },
      {
        "id": "measure-result-management",
        "title": "demos.measure-result-management",
        "description": "demos.measureDescription",
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
        "description": "demos.overviewDescription",
        "path": "demos/widgets/overview.html"
      },
      {
        "id": "widgets-coordinate-status",
        "title": "demos.widgets-coordinate-status",
        "description": "demos.coordinateStatusDescription",
        "path": "demos/widgets/coordinate-status.html"
      },
      {
        "id": "widgets-navigation",
        "title": "demos.widgets-navigation",
        "description": "demos.navigationDescription",
        "path": "demos/widgets/navigation.html"
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
        "id": "group-visualization-basics",
        "title": "groups.visualizationBasics",
        "children": [
          {
            "id": "visualization-point-line-polygon",
            "title": "demos.visualization-point-line-polygon",
            "description": "demos.visualizationBasicsDescription",
            "path": "demos/visualization/entities/basic.html"
          },
          {
            "id": "visualization-dynamic-line",
            "title": "demos.visualization-dynamic-line",
            "description": "demos.visualizationLinesDescription",
            "path": "demos/visualization/materials/lines.html"
          },
          {
            "id": "visualization-area-materials",
            "title": "demos.visualization-area-materials",
            "description": "demos.visualizationAreasDescription",
            "path": "demos/visualization/materials/areas.html"
          }
        ]
      },
      {
        "id": "group-visualization-markers",
        "title": "groups.visualizationMarkers",
        "children": [
          {
            "id": "visualization-labels-icons",
            "title": "demos.visualization-labels-icons",
            "description": "demos.visualizationMarkersDescription",
            "path": "demos/visualization/markers/labels-icons.html"
          },
          {
            "id": "visualization-html-labels",
            "title": "demos.visualization-html-labels",
            "description": "demos.visualizationHtmlLabelsDescription",
            "path": "demos/visualization/markers/labels.html"
          },
          {
            "id": "visualization-popup",
            "title": "demos.visualization-popup",
            "description": "demos.visualizationPopupsDescription",
            "path": "demos/visualization/markers/popup.html"
          },
          {
            "id": "visualization-bounce",
            "title": "demos.visualization-bounce",
            "description": "demos.visualizationMotionMarkersDescription",
            "path": "demos/visualization/markers/motion.html"
          },
          {
            "id": "visualization-video-overlay",
            "title": "demos.visualization-video-overlay",
            "description": "demos.visualizationVideoMarkersDescription",
            "path": "demos/visualization/markers/video.html"
          },
          {
            "id": "visualization-clustering",
            "title": "demos.visualization-clustering",
            "description": "demos.visualizationClustersDescription",
            "path": "demos/visualization/markers/clustering.html"
          }
        ]
      },
      {
        "id": "group-visualization-thematic",
        "title": "groups.visualizationThematic",
        "children": [
          {
            "id": "visualization-migration",
            "title": "demos.visualization-migration",
            "description": "demos.visualizationThematicMigrationDescription",
            "path": "demos/visualization/thematic/migration.html"
          },
          {
            "id": "visualization-scatter",
            "title": "demos.visualization-scatter",
            "description": "demos.visualizationThematicScatterDescription",
            "path": "demos/visualization/thematic/scatter.html"
          },
          {
            "id": "visualization-heatmap",
            "title": "demos.visualization-heatmap",
            "description": "demos.visualizationThematicHeatmapDescription",
            "path": "demos/visualization/thematic/heatmap.html"
          },
          {
            "id": "visualization-aggregation",
            "title": "demos.visualization-aggregation",
            "description": "demos.visualizationThematicAggregationDescription",
            "path": "demos/visualization/thematic/aggregation.html"
          },
          {
            "id": "visualization-regions",
            "title": "demos.visualization-regions",
            "description": "demos.visualizationThematicRegionsDescription",
            "path": "demos/visualization/thematic/regions.html"
          }
        ]
      },
      {
        "id": "group-visualization-projection",
        "title": "groups.visualizationProjection",
        "children": [
          {
            "id": "visualization-video-projection",
            "title": "demos.visualization-video-projection",
            "description": "demos.visualizationVideoProjectionDescription",
            "path": "demos/visualization/projection/video.html"
          }
        ]
      }
    ]
  },
  {
    "id": "group-effects",
    "title": "groups.effects",
    "children": [
      {
        "id": "effect-weather",
        "title": "demos.effect-weather",
        "description": "demos.weatherDescription",
        "path": "demos/effects/weather.html"
      },
      {
        "id": "effect-particle",
        "title": "demos.effect-particle",
        "description": "demos.particleDescription",
        "path": "demos/effects/particle.html"
      },
      {
        "id": "effect-water",
        "title": "demos.effect-water",
        "description": "demos.visualizationScaffoldDescription",
        "path": "demos/effects/water.html"
      },
      {
        "id": "effect-point-lights",
        "title": "demos.effect-point-lights",
        "description": "demos.visualizationScaffoldDescription",
        "path": "demos/effects/point-lights.html"
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
