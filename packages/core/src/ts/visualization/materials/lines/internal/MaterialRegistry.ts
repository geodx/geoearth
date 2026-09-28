import { defined, Material } from 'cesium'

interface MaterialCache {
    getMaterial(type: string): unknown
    addMaterial(type: string, template: unknown): void
}

/**
 * 注册 Entity 自定义材质。
 *
 * Cesium 暂未公开 Entity 材质注册 API，因此将私有 API 集中封装在这里。
 */
export function registerMaterial(type: string, uniforms: Record<string, unknown>, source: string): void {
    const cache = (Material as unknown as { _materialCache: MaterialCache })._materialCache

    if (defined(cache.getMaterial(type))) return

    cache.addMaterial(type, {
        fabric: {
            type,
            uniforms,
            source
        },
        translucent: () => true
    })
}