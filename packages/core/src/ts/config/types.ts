import type { Viewer } from 'cesium'
import { ImageryResourceItem, ResourceItem } from '../sources/types'

export interface Config {

    ionAccessToken?: string
    homeView?: {
        longitude: number,
        latitude: number,
        height: number,
        heading?: number,
        pitch?: number,
        roll?: number
    }
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
        imagery: ImageryResourceItem[]
        terrains: ResourceItem[]
        models: ResourceItem[]
        tilesets: ResourceItem[]
        geojson: ResourceItem[]
        poi: ResourceItem[]
    }
}
