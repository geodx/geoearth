import { ImageryResourceItem, ResourceItem } from "../sources/types";
import { defaultConfig } from "./defaultConfig";
import { Config } from "./types";
export class ConfigManager {
    private readonly config: Config;

    constructor(input: Config = {}) {
        this.config = this.createConfig(input);
    }
    /**
     * 获取初始化配置。
     */
    getConfig(): Config {
        return this.config;
    }

    /** 获取默认加载的底图配置 */
    getBaseImagery(): ImageryResourceItem | undefined {
        return this.config.resources.imagery.find(
            item =>
                item.defaultLoad &&
                item.properties.baseLayer === true
        );
    }
    /** 获取默认加载的地形配置 */
    getBaseTerrain(): ResourceItem | undefined {
        return this.config.resources.terrains.find(
            item => item.defaultLoad
        );
    }
    getResourcesById(id: string) {
        return this.getAllSources().find(item => {
            return item.id === id;
        });
    }
    getAllSources() {
        let s = this.config.resources;
        return [
            ...s.imagery,
            ...s.terrains,
            ...s.models,
            ...s.tilesets,
            ...s.geojson,
            ...s.poi
        ];
    }
    private createConfig(input: Config = {}): Config {
        const resources = input.resources;
        const defaultResources = defaultConfig.resources;
        const userImagery = (resources?.imagery ?? [])
        // 用户配置了底图，就移除 SDK 的默认底图。
        const hasCustomBaseLayer = userImagery.some(
            layer => layer.properties.baseLayer === true
        )
        const defaultImagery = hasCustomBaseLayer
            ? defaultResources.imagery.filter(
                layer => layer.properties.baseLayer !== true
            )
            : defaultResources.imagery
        const config: Config = {
            ionAccessToken: input.ionAccessToken ?? defaultConfig.ionAccessToken,

            homeView: { ...defaultConfig.homeView, ...input.homeView },

            startup: { ...defaultConfig.startup, ...input.startup },

            resources: {
                imagery: [...defaultImagery, ...userImagery],
                terrains: [...(resources?.terrains ?? defaultResources.terrains ?? [])],
                models: [...(resources?.models ?? defaultResources.models ?? [])],
                tilesets: [...(resources?.tilesets ?? defaultResources.tilesets ?? [])],
                geojson: [...(resources?.geojson ?? defaultResources.geojson ?? [])],
                poi: [...(resources?.poi ?? defaultResources.poi ?? [])]
            }
        }
        this.validateConfig(config);
        return config;
    }

    /** 校验资源分类、全局 ID 和默认加载项 */
    private validateConfig(config: Config): void {
        const resources = config.resources;

        const baseImagery = resources.imagery.filter(
            item => item.defaultLoad && item.properties.baseLayer === true
        );

        if (baseImagery.length > 1) {
            throw new Error('只能配置一个默认加载的底图。');
        }

        const baseTerrains = resources.terrains.filter(
            item => item.defaultLoad
        );

        if (baseTerrains.length > 1) {
            throw new Error('只能配置一个默认加载的地形。');
        }
    }

}
