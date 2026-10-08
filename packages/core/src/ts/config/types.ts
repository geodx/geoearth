import type { Viewer } from 'cesium'
import { ImageryResourceItem, ResourceItem } from '../sources/types'
import { Viewpoint } from '../viewer/types'

export interface Config {

    ionAccessToken?: string
    homeView?: Viewpoint

    startup?: {
        animation?: boolean
        showFps?: boolean
        zoomFactor?: number
        resolutionScale?: number
        backgroundColor?: string
        globeBaseColor?: string
        fxaa?: boolean
    }
    resources?: {
        layers: ImageryResourceItem[]
        terrains: ResourceItem[]
        models: ResourceItem[]
        tilesets: ResourceItem[]
        geojson: ResourceItem[]
        poi: ResourceItem[]
    }
}
