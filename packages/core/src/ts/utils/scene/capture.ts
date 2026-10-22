import type { SceneHost } from './types'

export interface CaptureOptions {
    type?: 'image/png' | 'image/jpeg' | 'image/webp'
    quality?: number
    watermark?: string
    signal?: AbortSignal
}

/** 在下一帧渲染后立即复制场景画布，避免默认 WebGL 缓冲区清空；不截图页面 DOM。 */
export function captureScene(host: SceneHost, options: CaptureOptions = {}): Promise<Blob> {
    const viewer = 'viewer' in host ? host.viewer : host
    if (viewer.isDestroyed()) return Promise.reject(new Error('地球已销毁。'))
    return new Promise((resolve, reject) => {
        let removeFrame: (() => void) | undefined
        let removeDestroy: (() => void) | undefined
        const cleanup = () => { removeFrame?.(); removeDestroy?.(); options.signal?.removeEventListener('abort', abort) }
        const fail = (error: unknown) => { cleanup(); reject(error) }
        const abort = () => fail(options.signal?.reason ?? new DOMException('截图已取消。', 'AbortError'))
        if (options.signal?.aborted) { abort(); return }
        options.signal?.addEventListener('abort', abort, { once: true })
        if ('onBeforeDestroy' in host) removeDestroy = host.onBeforeDestroy(() => fail(new Error('截图完成前地球已销毁。')))
        removeFrame = viewer.scene.postRender.addEventListener(() => {
            cleanup()
            try {
                const canvas = viewer.container.ownerDocument.createElement('canvas')
                canvas.width = viewer.canvas.width
                canvas.height = viewer.canvas.height
                const context = canvas.getContext('2d')!
                context.drawImage(viewer.canvas, 0, 0)
                if (options.watermark) {
                    context.font = '16px sans-serif'
                    context.fillStyle = '#fff'
                    context.shadowColor = '#000'
                    context.shadowBlur = 3
                    context.textAlign = 'right'
                    context.fillText(options.watermark, canvas.width - 16, canvas.height - 16)
                }
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('场景画布无法导出图片。')), options.type ?? 'image/png', options.quality)
            } catch (error) { reject(error) }
        })
        viewer.scene.requestRender()
    })
}
