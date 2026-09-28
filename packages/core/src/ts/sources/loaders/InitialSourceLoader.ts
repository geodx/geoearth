import { Config } from '../../config/types'
import type { ResourceManager } from '../ResourceManager'
import { InitialSourceItem, ResourceItem, SourceLoadFailure, SourceLoadResult, SourceLoadSuccess, SourceType } from '../types'

/**
 * 加载基础显示资源。
 *
 * 地形和影像决定地球的基础显示效果，
 * 应在模型、3D Tiles、POI 等资源之前加载。
 */
export async function loadBaseSources(resourceManager: ResourceManager, config: Config): Promise<SourceLoadResult> {
    const resources = config.resources
    const baseSources: InitialSourceItem[] = [
        ...getDefaultSources(
            SourceType.TERRAIN,
            resources.terrains
        ),
        ...getDefaultSources(
            SourceType.LAYER,
            resources.layers
        )
    ]
    return loadSourceGroup(resourceManager, baseSources)
}

/**
 * 加载默认业务资源。
 *
 * 这些资源互相之间没有强制顺序，因此并行创建。
 */
export async function loadDefaultSources(resourceManager: ResourceManager, config: Config): Promise<SourceLoadResult> {
    const resources = config.resources

    const defaultSources: InitialSourceItem[] = [
        ...getDefaultSources(
            SourceType.MODEL,
            resources.models
        ),
        ...getDefaultSources(
            SourceType.TILESET,
            resources.tilesets
        ),
        ...getDefaultSources(
            SourceType.GEOJSON,
            resources.geojson
        ),
        ...getDefaultSources(
            SourceType.POI,
            resources.poi
        )
    ]

    return loadSourceGroup(
        resourceManager,
        defaultSources
    )
}

/**
 * 从资源列表中过滤需要自动加载的资源。
 */
function getDefaultSources(type: SourceType, resources: ResourceItem[]): InitialSourceItem[] {
    return resources
        .filter(resource => resource.defaultLoad)
        .map(config => ({
            type,
            config
        }))
}

/**
 * 加载一组资源。
 *
 * 使用 Promise.allSettled，确保一个资源失败时，
 * 不会阻止同一组中的其他资源继续加载。
 */
async function loadSourceGroup(resourceManager: ResourceManager, sources: InitialSourceItem[]): Promise<SourceLoadResult> {
    const settledResults = await Promise.allSettled(
        sources.map(source =>
            resourceManager.add(source.type, source.config)
        )
    )

    const successes: SourceLoadSuccess[] = []
    const failures: SourceLoadFailure[] = []

    settledResults.forEach((result, index) => {
        const source = sources[index]
        if (!source) {
            return
        }

        if (result.status === 'fulfilled') {
            successes.push({
                type: source.type,
                config: source.config,
                instance: result.value
            })

            return
        }

        failures.push({
            type: source.type,
            config: source.config,
            error: result.reason
        })
    })

    return {
        successes,
        failures
    }
}


/**
 * 加载配置中的全部默认资源。
 *
 * 加载顺序：
 * 1. 基础地形和影像。
 * 2. 模型、3D Tiles、GeoJSON 和 POI。
 */
export async function loadInitialSources(resourceManager: ResourceManager, config: Config): Promise<SourceLoadResult> {
    const baseResult = await loadBaseSources(resourceManager, config)

    const defaultResult = await loadDefaultSources(resourceManager, config)

    return {
        successes: [
            ...baseResult.successes,
            ...defaultResult.successes
        ],
        failures: [
            ...baseResult.failures,
            ...defaultResult.failures
        ]
    }
}