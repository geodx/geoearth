import type { Viewer } from 'cesium'
import type { CameraManager } from '../camera/CameraManager'
import { LinkedEarthFactory, LinkedView, LinkedViewHost } from './linkage'
import { Navigation } from './navigation'
import { OverviewMap } from './overview'
import { ResourceTree, type ResourceTreeHost } from './resource-tree'

export class WidgetManager {
    readonly overview: OverviewMap
    readonly navigation: Navigation
    readonly resourceTree: ResourceTree
    readonly linkage: LinkedView

    constructor(
        viewer: Viewer,
        earth: ResourceTreeHost & LinkedViewHost & { camera: CameraManager },
        createEarth: LinkedEarthFactory
    ) {
        this.overview = new OverviewMap(viewer)
        this.navigation = new Navigation(viewer, earth.camera)
        this.resourceTree = new ResourceTree(earth)
        this.linkage = new LinkedView(earth, createEarth)
    }

    destroy(): void {
        this.linkage.destroy()
        this.resourceTree.destroy()
        this.overview.destroy()
        this.navigation.destroy()
    }
}
