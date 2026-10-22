import type { Viewer } from 'cesium'

/** 传入 GeoEarth 时自动随地球销毁；仅传入 Viewer 时，由调用方负责销毁。 */
export type SceneHost = Viewer | {
    readonly viewer: Viewer
    onBeforeDestroy(callback: () => void): () => void
}
