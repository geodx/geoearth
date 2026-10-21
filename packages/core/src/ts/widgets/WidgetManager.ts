import type { Viewer } from 'cesium'
import { OverviewMap } from './overview'
import { Navigation } from './navigation'
import type { CameraManager } from '../camera/CameraManager'
import { ResourceTree, type ResourceTreeHost } from './resource-tree'

export class WidgetManager {
    readonly overview: OverviewMap
    readonly navigation: Navigation
    readonly resourceTree: ResourceTree

    constructor(viewer: Viewer, earth: ResourceTreeHost & { camera: CameraManager }) {
        this.overview = new OverviewMap(viewer)
        this.navigation = new Navigation(viewer, earth.camera)
        this.resourceTree = new ResourceTree(earth)
    }

    destroy(): void {
        this.resourceTree.destroy()
        this.overview.destroy()
        this.navigation.destroy()
    }
}
