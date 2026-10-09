import { ImageryProviderType, ImageryResourceItem, ResourceItem } from "../sources/types"
import { Viewpoint } from "../viewer/types"
import { defaultConfig } from "./defaultConfig"
import { Config } from "./types"

export function createConfig(input: Config = {}): Config {
    const userLayers = input.resources?.layers ?? []
    // 用户配置了底图，就移除 SDK 的默认底图。
    const hasCustomBaseLayer = userLayers.some(
        layer => layer.properties.baseLayer === true
    )
    const defaultLayers = hasCustomBaseLayer
        ? defaultConfig.resources.layers.filter(
            layer => layer.properties.baseLayer !== true
        )
        : defaultConfig.resources.layers
    return {
        ionAccessToken: input.ionAccessToken ?? defaultConfig.ionAccessToken,

        homeView: {
            ...defaultConfig.homeView,
            ...input.homeView
        },

        startup: {
            ...defaultConfig.startup,
            ...input.startup
        },

        resources: {
            layers: [...defaultLayers, ...userLayers],
            terrains: [...(input.resources?.terrains ?? defaultConfig.resources.terrains)],
            models: [...(input.resources?.models ?? defaultConfig.resources.models)],
            tilesets: [...(input.resources?.tilesets ?? defaultConfig.resources.tilesets)],
            geojson: [...(input.resources?.geojson ?? defaultConfig.resources.geojson)],
            poi: [...(input.resources?.poi ?? defaultConfig.resources.poi)]
        }
    }
}


