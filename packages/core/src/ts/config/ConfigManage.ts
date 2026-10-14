import { ImageryResourceItem, ResourceItem, SourceType } from "../sources/types";
import { SafeTool } from "../utils";
import { defaultConfig } from "./defaultConfig"
import { Config } from "./types"
export class ConfigManage {
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
    getResourcesByPid(pid: string) {
        return this.getAllSources().find(item => {
            return item.pid === pid;
        });
    },
    getAllSources() {
        let s = this.config;
        return [
            ...s.layerList,
            ...s.terrainList,
            ...s.modelList,
            ...s.cesium3DTileSetList,
            ...s.geoJsonList,
            ...s.poiList
        ];
    },
    private createConfig(input: Config = {}): Config {
        const resources = input.resources;
        const defaultResources = defaultConfig.resources;
        const userImagery = (resources?.imagery ?? []).map(this.normalizeResource)
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
                imagery: [...defaultImagery.map(this.normalizeResource), ...userImagery],
                terrains: [...(resources?.terrains ?? defaultResources.terrains ?? [])].map(this.normalizeResource),
                models: [...(resources?.models ?? defaultResources.models ?? [])].map(this.normalizeResource),
                tilesets: [...(resources?.tilesets ?? defaultResources.tilesets ?? [])].map(this.normalizeResource),
                geojson: [...(resources?.geojson ?? defaultResources.geojson ?? [])].map(this.normalizeResource),
                poi: [...(resources?.poi ?? defaultResources.poi ?? [])].map(this.normalizeResource)
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
    /** 资源访问合法性   */
    private normalizeResource<T extends ResourceItem>(input: T): T {
        if (!input || typeof input !== 'object') {
            throw new Error('资源配置不能为空。');
        }

        if (!input.properties || typeof input.properties !== 'object'
            || Array.isArray(input.properties)) {
            throw new Error(`资源「${input.name}」的 properties 必须是对象。`);
        }

        // 复制资源及 properties 外层，保留内部 Cesium 对象和回调。
        const item = { ...input };
        item.properties = { ...input.properties };

        item.id ||= SafeTool.uuid();
        item.showInTree ??= true  // 默认在资源树中显示
        item.defaultLoad ??= true // 默认自动加载
        item.show ??= true        // 加载后默认显示

        item.offlineCache ??= false;

        return item;
    }
}


