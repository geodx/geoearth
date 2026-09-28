import type { Viewer } from 'cesium'
import { OverviewMap } from './overview'

export class WidgetManager {
    readonly overview: OverviewMap

    constructor(viewer: Viewer) {
        this.overview = new OverviewMap(viewer)
    }

    destroy(): void {
        this.overview.destroy()
    }
}