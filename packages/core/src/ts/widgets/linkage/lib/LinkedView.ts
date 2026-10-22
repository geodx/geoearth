import type { GeoEarth } from '../../../GeoEarth'
import type {
    LinkedEarthFactory,
    LinkedViewHost,
    LinkedViewOptions,
} from '../types'
import {
    createLinkedViewContainer,
    type LinkedViewContainer,
} from './createLinkedViewContainer'
import { createLinkedViewer } from './createLinkedViewer'
import { ViewSynchronizer } from './ViewSynchronizer'

export class LinkedView {
    private secondary?: GeoEarth
    private container?: LinkedViewContainer
    private synchronizer?: ViewSynchronizer
    private resizeObserver?: ResizeObserver
    private removeSecondaryDestroy?: () => void

    private loading = false
    private revision = 0
    private visible = false
    private enabled = true
    private secondaryRenderLoop = true

    constructor(
        private readonly main: LinkedViewHost,
        private readonly factory: LinkedEarthFactory,
    ) { }

    get isCreated(): boolean {
        return this.synchronizer !== undefined
    }

    get isVisible(): boolean {
        return this.visible
    }

    get isEnabled(): boolean {
        return this.enabled
    }

    /** 可通过副地球的 sources 添加它自己的业务资源。 */
    get secondaryEarth(): GeoEarth | undefined {
        return this.secondary
    }

    async create(options: LinkedViewOptions = {}): Promise<this> {
        if (this.loading) {
            throw new Error('[GeoEarth linkage] 正在创建，请勿重复调用')
        }

        if (this.main.viewer.isDestroyed()) {
            throw new Error('[GeoEarth linkage] 主地球已销毁')
        }

        const ratio = options.ratio ?? 0.5

        if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) {
            throw new RangeError('ratio 必须大于 0、小于 1')
        }

        if (
            options.layout !== undefined &&
            !['horizontal', 'vertical'].includes(options.layout)
        ) {
            throw new RangeError('layout 仅支持 horizontal 或 vertical')
        }

        if (
            options.sceneMode !== undefined &&
            !['2D', '3D'].includes(options.sceneMode)
        ) {
            throw new RangeError('sceneMode 仅支持 2D 或 3D')
        }

        this.destroy()

        const revision = this.revision
        this.loading = true

        try {
            this.container = createLinkedViewContainer(
                this.main.viewer,
                options,
            )

            const secondary = createLinkedViewer(
                this.container.secondary,
                this.main,
                options,
                this.factory,
            )

            this.secondary = secondary

            this.removeSecondaryDestroy = secondary.onBeforeDestroy(() => {
                // 副地球被外部销毁时，也恢复主视图布局。
                this.secondary = undefined
                this.destroy()
            })

            await Promise.all([
                this.main.onReady(),
                secondary.onReady(),
            ])

            if (
                revision !== this.revision ||
                this.main.viewer.isDestroyed() ||
                secondary.viewer.isDestroyed()
            ) {
                throw new Error('[GeoEarth linkage] 创建过程已终止')
            }

            this.synchronizer = new ViewSynchronizer(
                this.main.viewer,
                secondary.viewer,
                options.bidirectional ?? true,
                error => {
                    this.enabled = false

                    if (options.onError) {
                        options.onError(error)
                    } else {
                        console.error('[GeoEarth linkage]', error)
                    }
                },
            )

            this.enabled = options.enabled ?? true
            this.visible = true
            this.secondaryRenderLoop = secondary.viewer.useDefaultRenderLoop

            this.resizeObserver = new ResizeObserver(() => {
                this.resize()
            })

            this.resizeObserver.observe(this.main.viewer.container)

            this.resize()
            this.synchronizer.setEnabled(this.enabled)

            return this
        } catch (error) {
            if (revision === this.revision) {
                this.destroy()
            }

            throw error
        } finally {
            this.loading = false
        }
    }

    show(): void {
        if (!this.synchronizer || !this.secondary) return

        this.container?.setVisible(true)
        this.visible = true

        this.secondary.viewer.useDefaultRenderLoop = this.secondaryRenderLoop
        this.synchronizer.syncFrom(this.main.viewer)
        this.resize()
        this.synchronizer.setEnabled(this.enabled)
    }

    hide(): void {
        if (!this.visible || !this.synchronizer || !this.secondary) return

        this.synchronizer.setEnabled(false)

        this.secondaryRenderLoop =
            this.secondary.viewer.useDefaultRenderLoop

        this.secondary.viewer.useDefaultRenderLoop = false

        this.container?.setVisible(false)
        this.visible = false

        this.resize()
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled

        this.synchronizer?.setEnabled(
            enabled && this.visible,
        )
    }

    syncFrom(earth: GeoEarth): void {
        this.synchronizer?.syncFrom(earth.viewer)
    }

    destroy(): void {
        this.revision += 1

        this.resizeObserver?.disconnect()
        this.resizeObserver = undefined

        this.synchronizer?.destroy()
        this.synchronizer = undefined

        this.removeSecondaryDestroy?.()
        this.removeSecondaryDestroy = undefined

        const secondary = this.secondary
        this.secondary = undefined

        if (secondary && !secondary.viewer.isDestroyed()) {
            secondary.destroy()
        }

        this.container?.destroy()
        this.container = undefined
        this.visible = false

        if (!this.main.viewer.isDestroyed()) {
            this.main.viewer.resize()
            this.main.viewer.scene.requestRender()
        }
    }

    private resize(): void {
        const primary = this.main.viewer

        if (!primary.isDestroyed()) {
            primary.resize()
            primary.scene.requestRender()
        }

        const secondary = this.secondary?.viewer

        if (
            this.visible &&
            secondary &&
            !secondary.isDestroyed()
        ) {
            secondary.resize()
            secondary.scene.requestRender()
        }

        this.synchronizer?.sync()
    }
}