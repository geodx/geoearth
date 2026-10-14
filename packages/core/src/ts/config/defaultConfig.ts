import { Assets } from "../../assets/urls";
import { ImageryScheme, ResourceItem, SourceType } from "../sources/types";
import { Config } from "./types";

export const defaultConfig: Config = {
    ionAccessToken: '',
    homeView: {
        longitude: 108.387,
        latitude: 30.71,
        height: 4000000,
        heading: 0,
        pitch: -90,
        roll: 0,
        unit: 'degree'
    },
    startup: {
        animation: true,
        showFps: false,
        zoomFactor: 2,
        resolutionScale: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
        backgroundColor: '#000000',
        globeBaseColor: '#000000',
        fxaa: false
    },

    resources: {
        imagery: [
            {
                id: 'geoearth-base-imagery',
                name: '全球影像底图',
                catalog: '基础影像',
                sourceType: SourceType.IMAGERY,
                showInTree: false,
                defaultLoad: true,
                show: true,
                offlineCache: false,
                properties: {
                    scheme: ImageryScheme.SINGLE_TILE,
                    url: Assets.earth[2],
                    baseLayer: true,
                }
            }
        ],
        terrains: [] as ResourceItem[],
        models: [] as ResourceItem[],
        tilesets: [] as ResourceItem[],
        geojson: [] as ResourceItem[],
        poi: [] as ResourceItem[]
    }
}