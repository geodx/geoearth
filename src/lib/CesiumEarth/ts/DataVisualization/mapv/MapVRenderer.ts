import { Viewer, Scene, Cartesian3, SceneMode, SceneTransforms, Math } from 'cesium';
import mapv from './lib/mapv'

import { MapVLayer } from './MapVLayer';
export class MapVRenderer extends (mapv as any).BaseLayer {
    public map: Viewer
    public dataSet: any
    public scene: Scene
    public options: any
    public context: '2d' | 'webgl'
    public mapVLayer: MapVLayer
    public devicePixelRatio = 1
    public stopAniamation = false
    public animation?: any

    constructor(viewer: Viewer, dataSet: any, options: {}, mapVLayer: MapVLayer) {

        super(viewer, dataSet, options)
        this.map = viewer
        this.dataSet = dataSet
        this.scene = viewer.scene
        this.options = options
        this.context = this.options.context || '2d'
        this.mapVLayer = mapVLayer
        this.init(this.options)
        this.argCheck(this.options)
        this.devicePixelRatio = window.devicePixelRatio || 1

        this.stopAniamation = false
        this.animation = this.options.animation
        this.bindEvent()

    }


    public clickEvent(e: any): void {
        const point = e?.point
        super.clickEvent?.(point, e)
    }

    public mousemoveEvent(e: any): void {
        const point = e?.point
        super.mousemoveEvent?.(point, e)
    }

    public addAnimatorEvent(): void {
        // 原始代码就是空实现
    }

    public animatorMovestartEvent(): void {
        const animation = this.options.animation
        if (this.isEnabledTime?.() && this.animator && animation?.stepsRange) {
            this.steps.step = animation.stepsRange.start
        }
    }

    public animatorMoveendEvent(): void {
        if (this.isEnabledTime?.() && this.animator) {
            // 原始代码这里基本没做事，保持兼容
        }
    }

    public bindEvent(): void {
        if (!this.options.methods) return
        // 原始源码这里也没真正注册，只是占位
        this.options.methods.click
        this.options.methods.mousemove
    }

    public unbindEvent(): void {
        let map = this.map;
        //  this.options.methods && (this.options.methods.click && map.off("click", this.clickEvent),
        //      this.options.methods.mousemove //&& map.off("mousemove", this.mousemoveEvent)
        //  )
    }

    public getContext(): RenderingContext | null {
        return this.mapVLayer.canvas.getContext(this.context)
    }

    public init(options: any): void {
        this.initDataRange(options)
        if (this.options.zIndex && this.mapVLayer.setZIndex) {
            this.mapVLayer.setZIndex(this.options.zIndex)
        }

        this.initAnimator()
    }

    public _canvasUpdate(time?: number): void {
        const scene = this.scene
        if (!this.mapVLayer || this.stopAniamation) return

        const animation = this.options.animation
        const context = this.getContext()
        if (!context) return

        if (this.isEnabledTime?.()) {
            if (time === undefined) {
                this.clear(context)
                return
            }

            if (this.context === '2d') {
                const ctx = context as CanvasRenderingContext2D
                ctx.save()
                ctx.globalCompositeOperation = 'destination-out'
                ctx.fillStyle = 'rgba(0, 0, 0, .1)'
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
                ctx.restore()
            }
        } else {
            this.clear(context)
        }

        if (this.context === '2d') {
            const ctx = context as any
            for (const key in this.options) {
                try {
                    ctx[key] = this.options[key]
                } catch {
                    // 有些字段不能直接挂给context，忽略
                }
            }
        } else {
            ; (context as WebGLRenderingContext).clear(
                (context as WebGLRenderingContext).COLOR_BUFFER_BIT,
            )
        }

        const transfer = {
            transferCoordinate: (coordinate: [number, number]) => {
                const fallback: [number, number] = [99999, 99999]
                const cartesian = Cartesian3.fromDegrees(coordinate[0], coordinate[1])
                if (!cartesian) return fallback

                const canvasPoint = scene.cartesianToCanvasCoordinates(cartesian)
                if (!canvasPoint) return fallback

                if (
                    scene.mode === SceneMode.SCENE3D &&
                    Cartesian3.angleBetween(scene.camera.position, cartesian) >
                    Math.toRadians(80)
                ) {
                    return false
                }

                return [canvasPoint.x, canvasPoint.y]
            },
        } as any

        if (time !== undefined) {
            transfer.filter = (item: any) => {
                const trails = animation?.trails || 10
                return !!(time && item.time > time - trails && item.time < time)
            }
        }

        const data = this.dataSet.get(transfer)
        this.processData?.(data)

        if (this.options.unit === 'm' && this.options.size) {
            this.options._size = this.options.size
        }

        const coord = SceneTransforms.worldToWindowCoordinates(
            scene,
            Cartesian3.fromDegrees(0, 0),
        )

        this.drawContext?.(
            context,
            new (mapv as any).DataSet(data),
            this.options,
            coord,
        )

        this.options.updateCallback?.(time)
    }

    public updateData(dataSet: any, options: any): void {
        if (!dataSet) return
        const data = dataSet.get()
        this.dataSet.set(data)
        super.update({ options })
    }

    public addData(dataSet: any, options: any): void {
        if (!dataSet) return
        const data = typeof dataSet.get === 'function' ? dataSet.get() : dataSet
        this.dataSet.add(data)
        this.update({ options })
    }
    public removeData(filter?: ((item: unknown) => boolean) | null): void {
        if (!this.dataSet) return

        const data = this.dataSet.get({
            filter: (item: unknown) => {
                return filter == null || typeof filter !== 'function' || !filter(item)
            },
        })

        this.dataSet.set(data)
        this.update({ options: null })
    }

    public clearData(): void {
        if (!this.dataSet) return

        this.dataSet.clear()
        this.update({ options: null })
    }

    public draw(): void {
        this.mapVLayer?.draw()
    }

    public clear(ctx: RenderingContext | null): void {
        if (!ctx) return
        if ('clearRect' in ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        }
    }

    public update(payload: any): void {
        if (payload.options) {
            this.options = {
                ...this.options,
                ...payload.options,
            }
        }

        this.draw()
    }

    public destroy(): void {
        this.unbindEvent()
        this.clear(this.getContext())
        this.clearData()

        if (this.animator) {
            this.animator.stop()
            this.animator = null
        }
    }
}