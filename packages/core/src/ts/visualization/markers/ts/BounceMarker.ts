import { Cartesian3, ConstantPositionProperty, Entity, type BillboardGraphics, type PositionProperty } from 'cesium'
import { OwnedResource } from '../../../utils/scene/OwnedResource'
import { toCartesian } from '../../../utils/coordinate/positions'
import type { VisualizationHost, VisualizationPosition } from '../../types'
import { MarkerAssets } from './assets'

export interface BounceMarkerOptions {
    position: VisualizationPosition
    height?: number
    /** 完整弹跳周期，单位：秒。 */
    duration?: number
    /** repeat 持续往复，settle 模拟衰减回弹并停在锚点。 */
    mode?: 'repeat' | 'settle'
    entity?: Entity
    billboard?: BillboardGraphics.ConstructorOptions
}

/** 沿标记所在位置的椭球法线往复弹跳，独立于全局时钟。 */
export class BounceMarker extends OwnedResource {
    readonly entity: Entity
    private readonly center: Cartesian3
    private readonly up: Cartesian3
    private readonly position = new ConstantPositionProperty()
    private readonly original?: PositionProperty
    private readonly borrowed: boolean
    private readonly height: number
    private readonly duration: number
    private removeFrame?: () => void
    private elapsed = 0
    private last = 0
    private readonly mode: 'repeat' | 'settle'

    constructor(host: VisualizationHost, options: BounceMarkerOptions) {
        const height = options.height ?? 100, duration = options.duration ?? 1.5
        if (!Number.isFinite(height) || height < 0 || !Number.isFinite(duration) || duration <= 0) throw new RangeError('Invalid bounce height or duration.')
        const center = toCartesian(options.position)
        super(host)
        this.center = center
        this.height = height
        this.duration = duration
        this.mode = options.mode ?? 'repeat'
        this.up = this.viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(center, new Cartesian3())
        this.borrowed = !!options.entity
        this.entity = options.entity ?? this.viewer.entities.add({ billboard: { image: MarkerAssets.bounce, ...options.billboard } })
        this.original = this.entity.position
        this.entity.position = this.position
        this.position.setValue(center)
    }

    play(): void {
        this.assertAlive()
        if (this.removeFrame) return
        this.last = performance.now()
        this.removeFrame = this.viewer.scene.preUpdate.addEventListener(() => {
            const now = performance.now()
            this.elapsed += (now - this.last) / 1000
            this.last = now
            const cycles = this.elapsed / this.duration
            const height = this.mode === 'repeat'
                ? Math.abs(Math.sin(cycles * Math.PI)) * this.height
                : Math.abs(Math.cos(cycles * Math.PI)) * this.height * Math.pow(.55, Math.floor(cycles))
            this.position.setValue(Cartesian3.add(this.center, Cartesian3.multiplyByScalar(this.up, height, new Cartesian3()), new Cartesian3()))
            this.requestRender()
            if (this.mode === 'settle' && Math.pow(.55, Math.floor(cycles)) < .001) this.stop()
        })
        this.requestRender()
    }

    /** 重新从起点播放，保留已有实体和资源。 */
    rebound(): void { this.stop(); this.play() }

    pause(): void {
        this.assertAlive()
        this.removeFrame?.()
        this.removeFrame = undefined
    }

    stop(): void {
        this.pause()
        this.elapsed = 0
        this.position.setValue(this.center)
        this.requestRender()
    }

    override destroy(): void {
        if (this.destroyed) return
        this.removeFrame?.()
        // 借用实体只恢复仍由本对象控制的位置，自建实体则直接移除。
        if (this.borrowed) {
            if (this.entity.position === this.position) this.entity.position = this.original
        }
        else if (!this.viewer.isDestroyed()) this.viewer.entities.remove(this.entity)
        super.destroy()
    }
}
