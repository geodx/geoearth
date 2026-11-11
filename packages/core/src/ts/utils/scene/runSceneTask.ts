import type { Viewer } from 'cesium'
import type { SceneHost } from './types'

/** 取消返回的计算任务，并在地球销毁后停止消费异步场景查询结果。 */
export async function runSceneTask<T>(
    host: SceneHost,
    signal: AbortSignal | undefined,
    task: (viewer: Viewer, signal: AbortSignal) => Promise<T>,
): Promise<T> {
    const viewer = 'viewer' in host ? host.viewer : host
    if (viewer.isDestroyed()) throw new Error('Viewer has been destroyed.')
    signal?.throwIfAborted()
    const controller = new AbortController()
    const cancel = () => controller.abort(signal?.reason)
    signal?.addEventListener('abort', cancel, { once: true })
    const detachHost = 'onBeforeDestroy' in host ? host.onBeforeDestroy(cancel) : undefined
    let rejectOnAbort: () => void
    const aborted = new Promise<never>((_resolve, reject) => {
        rejectOnAbort = () => reject(controller.signal.reason)
        controller.signal.addEventListener('abort', rejectOnAbort, { once: true })
    })
    try {
        const result = await Promise.race([task(viewer, controller.signal), aborted])
        controller.signal.throwIfAborted()
        if (viewer.isDestroyed()) throw new Error('Viewer has been destroyed.')
        return result
    } finally {
        controller.signal.removeEventListener('abort', rejectOnAbort)
        signal?.removeEventListener('abort', cancel)
        detachHost?.()
        controller.abort()
    }
}
