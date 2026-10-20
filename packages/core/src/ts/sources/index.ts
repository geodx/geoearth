export { ResourceManager } from './ResourceManager'

export { loadSources } from './loaders/InitialSourceLoader'
export { normalizeResource } from './loaders/normalizeResource'
export { ImageryScheme, SourceType, TerrainScheme } from './types'
export type {
    ResourceItem,
    ImageryProperties,
    ImageryResourceItem,
    XYZ3857ImageryProperties,
    XYZ4326ImageryProperties,
    WMSImageryProperties,
    WMTSImageryProperties,
    TMSImageryProperties,
    SingleTileImageryProperties,
    IonImageryProperties,
    ArcGisImageryProperties,
    TilesetProperties,
    TerrainProperties,
    TerrainResourceItem,
} from './types'

