import type { ImageryLayer } from 'cesium'

export interface LayerSplitOptions {
    left?: readonly ImageryLayer[]
    right?: readonly ImageryLayer[]
    position?: number
}
