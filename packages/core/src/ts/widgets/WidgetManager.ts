import type { Viewer } from 'cesium'
import { OverviewMap } from './overview'
import { ResourceTree, type ResourceTreeHost } from './resource-tree'

export class WidgetManager {
    readonly overview: OverviewMap
    readonly resourceTree: ResourceTree

    constructor(viewer: Viewer, earth: ResourceTreeHost) {
        this.overview = new OverviewMap(viewer)
        this.resourceTree = new ResourceTree(earth)
    }

    destroy(): void {
        this.resourceTree.destroy()
        this.overview.destroy()
    }
}
