import { Cartesian3, Entity, PolylineDashMaterialProperty, Color, type BillboardGraphics, type DistanceDisplayCondition } from 'cesium'
import { OwnedResource } from '../../../utils/scene/OwnedResource'
import { toCartesian } from '../../../utils/coordinate/positions'
import { sampleHeights } from '../../../utils/scene/heights'
import type { VisualizationHost, VisualizationPosition } from '../../types'
import { BounceMarker } from './BounceMarker'
import { MarkerAssets } from './assets'

export interface FloatingMarkerOptions {
    position: VisualizationPosition
    heightMode?: 'absolute' | 'terrain' | 'surface'
    lineHeight?: number
    bounceHeight?: number
    duration?: number
    billboard?: BillboardGraphics.ConstructorOptions
    distanceDisplayCondition?: DistanceDisplayCondition
    show?: boolean
}

/** 三维漂浮图标与固定虚线引线；位置采样和弹跳共用已有工具。 */
export class FloatingMarker extends OwnedResource {
    readonly entity: Entity
    readonly ready: Promise<void>
    private line?: Entity
    private bounce?: BounceMarker
    private visible: boolean
    private playing = true

    constructor(host: VisualizationHost, options: FloatingMarkerOptions) {
        const origin = toCartesian(options.position)
        const lineHeight = options.lineHeight ?? 16
        const bounceHeight = options.bounceHeight ?? 1
        const duration = options.duration ?? 2
        if (![lineHeight, bounceHeight, duration].every(Number.isFinite) || lineHeight < 0 || bounceHeight < 0 || duration <= 0) {
            throw new RangeError('引线和漂浮高度不能为负数，周期必须为正数。')
        }
        super(host)
        this.visible = options.show ?? true
        this.entity = this.viewer.entities.add({
            position: origin, show: false,
            billboard: { image: MarkerAssets.floating, width: 42, height: 78,
                distanceDisplayCondition: options.distanceDisplayCondition, ...options.billboard },
        })
        this.ready = this.initialize(origin, options, lineHeight, bounceHeight, duration)
            .catch(error => { this.destroy(); throw error })
    }

    get show(): boolean { return this.visible }
    set show(value: boolean) {
        this.assertAlive()
        this.visible = value
        this.entity.show = value && !!this.bounce
        if (this.line) this.line.show = value
        this.requestRender()
    }

    play(): void { this.assertAlive(); this.playing = true; this.bounce?.play() }
    pause(): void { this.assertAlive(); this.playing = false; this.bounce?.pause() }
    stop(): void { this.assertAlive(); this.playing = false; this.bounce?.stop() }

    private async initialize(origin: Cartesian3, options: FloatingMarkerOptions, lineHeight: number, height: number, duration: number): Promise<void> {
        const ellipsoid = this.viewer.scene.globe.ellipsoid
        const location = ellipsoid.cartesianToCartographic(origin)
        const mode = options.heightMode ?? 'absolute'
        if (mode !== 'absolute') {
            const [baseHeight] = await sampleHeights(this.viewer, [{
                longitude: location.longitude * 180 / Math.PI, latitude: location.latitude * 180 / Math.PI, height: location.height,
            }], { mode, exclude: [this.entity] })
            if (this.destroyed || this.viewer.isDestroyed()) return
            location.height += baseHeight
        }
        const anchor = ellipsoid.cartographicToCartesian(location)
        location.height += lineHeight
        const top = ellipsoid.cartographicToCartesian(location)
        this.line = this.viewer.entities.add({ show: this.visible, polyline: {
            positions: [anchor, top], width: 2,
            material: new PolylineDashMaterialProperty({ color: Color.AQUA }),
            distanceDisplayCondition: options.distanceDisplayCondition,
        } })
        this.bounce = new BounceMarker(this.viewer, { entity: this.entity, position: top, height, duration })
        this.entity.show = this.visible
        if (this.playing) this.bounce.play()
        this.requestRender()
    }

    override destroy(): void {
        if (this.destroyed) return
        this.bounce?.destroy()
        if (!this.viewer.isDestroyed()) {
            this.viewer.entities.remove(this.entity)
            if (this.line) this.viewer.entities.remove(this.line)
        }
        super.destroy()
    }
}
