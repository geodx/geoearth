import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import TestPlaceholder from '@/tests/TestPlaceholder.vue'

type TestComponent = NonNullable<RouteRecordRaw['component']>

export interface TestRouteItem {
    path: string
    title: string
    description: string
    component: TestComponent
}

export interface TestRouteGroup {
    title: string
    items: TestRouteItem[]
}

const pending = TestPlaceholder

export const testRouteGroups: TestRouteGroup[] = [
    {
        title: 'Basic',
        items: [
            {
                path: '/basic-viewer',
                title: 'Basic Viewer',
                description: 'Create a GeoEarth viewer with the default configuration.',
                component: () => import('@/tests/basic/BasicViewer.vue')
            },
            {
                path: '/config-load',
                title: 'Config Load',
                description: 'Load global GeoEarth configuration before creating a viewer.',
                component: pending
            },
            {
                path: '/overview',
                title: 'OverView',
                description: 'Verify viewer resize and lifecycle cleanup behavior.',
                component: () => import('@/tests/basic/OverView.vue')
            }
        ]
    },
    {
        title: 'Config',
        items: [
            { path: '/config/home-view', title: 'Home View', description: 'Configure initial camera home view.', component: pending },
            { path: '/config/token', title: 'Token', description: 'Configure Cesium Ion token and service tokens.', component: pending },
            { path: '/config/resources', title: 'Resources', description: 'Configure external GIS resource base URLs.', component: pending },
            { path: '/config/default-options', title: 'Viewer Options', description: 'Validate default Viewer constructor options.', component: pending }
        ]
    },
    {
        title: 'Camera',
        items: [
            { path: '/camera/fly-home', title: 'Fly Home', description: 'Fly the camera back to configured home view.', component: pending },
            { path: '/camera/fly-to', title: 'Fly To', description: 'Fly to longitude, latitude, height, heading, pitch, and roll.', component: pending },
            { path: '/camera/bookmark', title: 'Bookmark', description: 'Save and restore camera viewpoints.', component: pending },
            { path: '/camera/path-roaming', title: 'Path Roaming', description: 'Test camera roaming along a path.', component: pending }
        ]
    },
    {
        title: 'Layers',
        items: [
            { path: '/layers/imagery', title: 'Imagery Layer', description: 'Add, remove, show, hide, and reorder imagery layers.', component: pending },
            { path: '/layers/terrain', title: 'Terrain', description: 'Switch terrain providers and terrain options.', component: pending },
            { path: '/layers/tileset', title: '3D Tiles', description: 'Load and manage Cesium 3D Tileset resources.', component: pending },
            { path: '/layers/model', title: 'Model', description: 'Load glTF and glb model resources.', component: pending },
            { path: '/layers/geojson', title: 'GeoJSON', description: 'Load GeoJSON data sources and styling.', component: pending }
        ]
    },
    {
        title: 'Events',
        items: [
            { path: '/events/click', title: 'Click Event', description: 'Handle left click and picked position.', component: pending },
            { path: '/events/mouse-move', title: 'Mouse Move', description: 'Handle cursor movement and coordinate readout.', component: pending },
            { path: '/events/pick', title: 'Pick Object', description: 'Pick entities, primitives, and tileset features.', component: pending },
            { path: '/events/keyboard', title: 'Keyboard', description: 'Validate keyboard shortcuts and event cleanup.', component: pending }
        ]
    },
    {
        title: 'Entities',
        items: [
            { path: '/entities/point', title: 'Point', description: 'Create and update point entities.', component: pending },
            { path: '/entities/label', title: 'Label', description: 'Create labels and test visibility rules.', component: pending },
            { path: '/entities/polyline', title: 'Polyline', description: 'Create basic and material polylines.', component: pending },
            { path: '/entities/polygon', title: 'Polygon', description: 'Create polygons, outlines, and fills.', component: pending },
            { path: '/entities/popup', title: 'Popup', description: 'Attach HTML popup panels to scene positions.', component: pending }
        ]
    },
    {
        title: 'Tools',
        items: [
            { path: '/tools/measure', title: 'Measure', description: 'Measure  in the scene.', component: () => import('@/tests/tools/Measure.vue') },
            { path: '/tools/draw', title: 'Draw', description: 'Draw points, lines, polygons, and clear results.', component: () => import('@/tests/tools/Draw.vue') },
            { path: '/tools/plot', title: 'Plot', description: 'Create military or business plot graphics.', component: pending }
        ]
    },
    {
        title: 'Analysis',
        items: [
            { path: '/analysis/layer-split', title: 'Layer Split', description: 'Test imagery layer swipe comparison.', component: pending },
            { path: '/analysis/height-limit', title: 'Height Limit', description: 'Test height limitation analysis.', component: pending },
            { path: '/analysis/viewshed', title: 'Viewshed', description: 'Test viewshed or visibility analysis.', component: pending },
            { path: '/analysis/excavate', title: 'Excavate', description: 'Test terrain or model excavation analysis.', component: pending }
        ]
    },
    {
        title: 'Effects',
        items: [
            { path: '/effects/weather', title: 'Weather', description: 'Test rain, snow, fog, and atmosphere effects.', component: pending },
            { path: '/effects/water', title: 'Water', description: 'Test water material and animated surfaces.', component: pending },
            { path: '/effects/sky', title: 'Sky', description: 'Test skybox and environment options.', component: pending },
            { path: '/effects/particle', title: 'Particle', description: 'Test particle systems and custom effects.', component: pending }
        ]
    }
]

const testRoutes = testRouteGroups.flatMap((group) => group.items)

export const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            redirect: testRoutes[0].path
        },
        ...testRoutes.map((route) => ({
            path: route.path,
            component: route.component,
            meta: {
                title: route.title,
                description: route.description
            }
        }))
    ]
})
