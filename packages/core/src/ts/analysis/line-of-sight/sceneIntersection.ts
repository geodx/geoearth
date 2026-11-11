import { Cartesian3, Ray, SceneMode, type Scene, type Viewer } from 'cesium'
import type { LineOfSightObstruction } from './types'

interface RayIntersection {
    position?: Cartesian3
    object?: unknown
}

/** Cesium 1.146 的射线拾取入口尚未列入公开类型，集中在此适配。 */
interface RayScene extends Scene {
    pickFromRayMostDetailed?: (ray: Ray, exclude?: object[], width?: number) => Promise<RayIntersection | undefined>
}

export async function sceneIntersection(
    viewer: Viewer, observer: Cartesian3, target: Cartesian3, exclude: object[], tolerance: number, signal: AbortSignal,
): Promise<LineOfSightObstruction | undefined> {
    const scene = viewer.scene
    const rayScene = scene as RayScene
    if (scene.mode !== SceneMode.SCENE3D || !scene.pickPositionSupported || !rayScene.pickFromRayMostDetailed) {
        throw new Error('当前场景不支持三维射线通视检查，请使用 terrain 模式。')
    }
    signal.throwIfAborted()
    // 下一帧先同步 Entity 的显隐与几何；异步几何准备完成后再求交。
    await new Promise<void>((resolve, reject) => {
        const finish = (error?: unknown) => {
            removeRender()
            removeError()
            signal.removeEventListener('abort', abort)
            if (error) reject(error)
            else resolve()
        }
        const abort = () => finish(signal.reason)
        const removeRender = scene.postRender.addEventListener(() => {
            if (viewer.dataSourceDisplay.ready) finish()
            else scene.requestRender()
        })
        const removeError = scene.renderError.addEventListener((_scene, error) => finish(error))
        signal.addEventListener('abort', abort, { once: true })
        scene.requestRender()
    })
    signal.throwIfAborted()
    const delta = Cartesian3.subtract(target, observer, new Cartesian3())
    const length = Cartesian3.magnitude(delta)
    if (length <= tolerance * 2) return undefined
    const direction = Cartesian3.normalize(delta, delta)
    const origin = Cartesian3.add(observer, Cartesian3.multiplyByScalar(direction, tolerance, new Cartesian3()), new Cartesian3())
    const hit = await rayScene.pickFromRayMostDetailed(new Ray(origin, direction), exclude, tolerance)
    signal.throwIfAborted()
    // 地球的深度交点可能没有拾取对象，地形由独立的高程检测处理。
    if (!hit?.position || !hit.object) return undefined
    const distance = Cartesian3.dot(Cartesian3.subtract(hit.position, observer, new Cartesian3()), direction)
    if (distance <= tolerance || distance >= length - tolerance) return undefined
    return { position: Cartesian3.clone(hit.position), distance, source: 'scene', object: hit.object }
}
