import { ImageryProviderType, ImageryResourceItem, ResourceItem } from "../sources/types"
import { Viewpoint } from "../viewer/types"
import { defaultConfig } from "./defaultConfig"
import { Config } from "./types"

export function createConfig(input: Config = {}): Config {
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
            layers: [...defaultConfig.resources.layers, ...(input.resources?.layers ?? [])],
            terrains: [...(input.resources?.terrains ?? defaultConfig.resources.terrains)],
            models: [...(input.resources?.models ?? defaultConfig.resources.models)],
            tilesets: [...(input.resources?.tilesets ?? defaultConfig.resources.tilesets)],
            geojson: [...(input.resources?.geojson ?? defaultConfig.resources.geojson)],
            poi: [...(input.resources?.poi ?? defaultConfig.resources.poi)]
        }
    }
}


