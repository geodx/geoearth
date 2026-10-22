import type { DataSource, Viewer } from 'cesium'
import type { SceneHost } from './types'

/** 持有场景资源的内部基类，统一绑定地球生命周期和解除事件监听。 */
export abstract class OwnedResource {
    readonly viewer: Viewer
    protected destroyed = false
    private readonly disposers: Array<() => void> = []

    protected constructor(host: SceneHost) {
        this.viewer = 'viewer' in host ? host.viewer : host
        if (this.viewer.isDestroyed()) throw new Error('Viewer has been destroyed.')
        if ('onBeforeDestroy' in host) this.own(host.onBeforeDestroy(() => this.destroy()))
    }

    isDestroyed(): boolean {
        return this.destroyed
    }

    protected assertAlive(): void {
        if (this.destroyed || this.viewer.isDestroyed()) throw new Error(`${this.constructor.name} has been destroyed.`)
    }

    protected own(dispose: () => void): void {
        this.disposers.push(dispose)
    }

    protected requestRender(): void {
        if (!this.viewer.isDestroyed()) this.viewer.scene.requestRender()
    }

    protected attachDataSource(source: DataSource): Promise<void> {
        return this.viewer.dataSources.add(source).then(() => {
            // 数据源可能晚于 destroy 完成挂载，届时立即移除，避免重新出现在场景中。
            if (this.destroyed && !this.viewer.isDestroyed()) this.viewer.dataSources.remove(source, true)
            else this.requestRender()
        })
    }

    /** 重复销毁只清理一次；子类仅释放自己创建的资源。 */
    destroy(): void {
        if (this.destroyed) return
        this.destroyed = true
        for (const dispose of this.disposers.splice(0).reverse()) dispose()
        this.requestRender()
    }
}
