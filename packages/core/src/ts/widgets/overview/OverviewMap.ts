import {
    CallbackProperty, Cartesian2, Cartesian3, Cartographic, CesiumWidget, Color, Entity,
    Math as CesiumMath, Matrix4, PolygonHierarchy, Rectangle, ScreenSpaceEventHandler,
    ScreenSpaceEventType
} from 'cesium';

import { resolveContainer } from '../../viewer/resolveContainer';
import { createOverview } from './createOverview';
import { createRoot } from './createRootContainer';

import type { Viewer } from 'cesium'
import type { OverviewMapOptions } from './types'

interface ScreenBounds {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
}

export class OverviewMap {
    private overview?: CesiumWidget
    private root?: HTMLElement
    private footprintEntity?: Entity
    private overviewHandler?: ScreenSpaceEventHandler
    private resizeObserver?: ResizeObserver
    private removePostUpdateListener?: () => void
    private updateTimer?: ReturnType<typeof setTimeout>

    private readonly lastViewMatrix = new Matrix4()
    private readonly footprintValue = new PolygonHierarchy()

    private scaleFactor = 4
    private updateInterval = 50
    private minBoxRatio = 0.1
    private maxBoxRatio = 0.75
    private edgePadding = 12

    private isDraggingFootprint = false
    private pointerMoved = false
    private pointerDownPosition?: Cartesian2
    private dragStartPosition?: Cartographic
    private dragStartFootprint: Cartographic[] = []

    constructor(private readonly mainViewer: Viewer) { }

    get isOpen(): boolean {
        return this.overview !== undefined
    }

    open(options: OverviewMapOptions = {}): void {
        if (this.overview) {
            this.show()
            return
        }

        this.applyOptions(options)

        const embedded = options.container !== undefined
        const host = embedded ? resolveContainer(options.container) : (this.mainViewer.container as HTMLElement)
        const position = options.position ?? 'bottom-right'

        this.root = createRoot(host, embedded, position, options.width, options.height)
        this.overview = createOverview(this.root, options)
        this.footprintEntity = this.createFootprint(this.overview, options.fillColor, options.outlineColor)

        this.syncMainToOverview()
        this.syncOverviewToMain()

        this.overview.resize()
        this.update(true)
    }

    close(): void {
        this.removePostUpdateListener?.()
        this.removePostUpdateListener = undefined

        this.overviewHandler?.destroy()
        this.overviewHandler = undefined

        this.resizeObserver?.disconnect()
        this.resizeObserver = undefined

        if (this.updateTimer !== undefined) {
            clearTimeout(this.updateTimer)
            this.updateTimer = undefined
        }

        this.resetOverviewInteraction()

        if (this.overview && !this.overview.isDestroyed()) {
            this.overview.destroy()
        }

        this.root?.remove()

        this.footprintEntity = undefined
        this.overview = undefined
        this.root = undefined
        this.footprintValue.positions = []
    }

    show(): void {
        if (!this.root || !this.overview) return

        this.root.style.display = ''
        this.overview.resize()
        this.update(true)
    }

    hide(): void {
        if (this.root) {
            this.root.style.display = 'none'
        }
    }

    destroy(): void {
        this.close()
    }

    private applyOptions(options: OverviewMapOptions): void {
        this.minBoxRatio = CesiumMath.clamp(options.minBoxRatio ?? 0.1, 0.01, 0.49)
        this.maxBoxRatio = CesiumMath.clamp(options.maxBoxRatio ?? 0.75, this.minBoxRatio + 0.01, 0.95)
        this.scaleFactor = Math.max(options.scaleFactor ?? 4, 1 / this.maxBoxRatio)
        this.updateInterval = Math.max(options.updateInterval ?? 50, 0)
        this.edgePadding = Math.max(options.edgePadding ?? 12, 0)
    }

    /**
     * 监听主视图相机变化。
     */
    private syncMainToOverview(): void {
        Matrix4.clone(this.mainViewer.camera.viewMatrix, this.lastViewMatrix)

        this.removePostUpdateListener = this.mainViewer.scene.postUpdate.addEventListener(() => {
            this.scheduleUpdate()
        })

        this.resizeObserver = new ResizeObserver(() => {
            if (!this.overview) return

            this.overview.resize()
            this.update(true)
        })

        if (this.root) {
            this.resizeObserver.observe(this.root)
        }
    }

    private scheduleUpdate(): void {
        if (this.updateTimer !== undefined || this.isDraggingFootprint) return

        this.updateTimer = setTimeout(() => {
            this.updateTimer = undefined

            if (!this.detectCameraChange()) return

            this.update()
        }, this.updateInterval)
    }

    private detectCameraChange(): boolean {
        const viewMatrix = this.mainViewer.camera.viewMatrix

        if (Matrix4.equalsEpsilon(viewMatrix, this.lastViewMatrix, CesiumMath.EPSILON12)) {
            return false
        }

        Matrix4.clone(viewMatrix, this.lastViewMatrix)

        return true
    }

    /**
     * 更新红框，并按需调整鹰眼视角。
     */
    private update(forceReset = false): void {
        if (!this.overview || this.mainViewer.isDestroyed()) return

        const ellipsoid = this.mainViewer.scene.globe.ellipsoid
        const fallback = this.mainViewer.camera.computeViewRectangle(ellipsoid)
        const positions = this.computeFootprint(fallback)

        this.updateFootprint(positions)

        if (positions.length < 3) return

        const footprintRectangle = this.getRectangleFromPositions(positions)
        if (!footprintRectangle) return

        if (forceReset) {
            this.resetOverviewExtent(footprintRectangle)
        } else {
            this.validateOverviewExtent(positions, footprintRectangle)
        }

        this.overview.scene.requestRender()
    }

    /**
     * 优先通过主视图四角射线计算真实可视范围。
     */
    private computeFootprint(fallback?: Rectangle): Cartesian3[] {
        const canvas = this.mainViewer.scene.canvas
        const width = canvas.clientWidth
        const height = canvas.clientHeight

        if (width > 0 && height > 0) {
            const pixels = [
                new Cartesian2(0, 0),
                new Cartesian2(width - 1, 0),
                new Cartesian2(width - 1, height - 1),
                new Cartesian2(0, height - 1)
            ]

            const positions = pixels
                .map(pixel => this.mainViewer.camera.getPickRay(pixel))
                .map(ray => ray && this.mainViewer.scene.globe.pick(ray, this.mainViewer.scene))
                .filter((position): position is Cartesian3 => position !== undefined)

            if (positions.length >= 3) {
                return positions
            }
        }

        if (!fallback) return []

        const ellipsoid = this.mainViewer.scene.globe.ellipsoid

        return [
            new Cartographic(fallback.west, fallback.south),
            new Cartographic(fallback.east, fallback.south),
            new Cartographic(fallback.east, fallback.north),
            new Cartographic(fallback.west, fallback.north)
        ].map(position => ellipsoid.cartographicToCartesian(position))
    }

    private updateFootprint(positions: Cartesian3[]): void {
        if (!this.footprintEntity || !this.overview) return

        if (positions.length < 3) {
            this.footprintEntity.show = false
            return
        }

        this.footprintEntity.show = true
        this.footprintValue.positions = positions
        this.overview.scene.requestRender()
    }

    /**
     * 红框大小超出比例时重置鹰眼缩放，触碰边界时只重新居中。
     */
    private validateOverviewExtent(positions: Cartesian3[], footprintRectangle: Rectangle): void {
        if (!this.overview) return

        const bounds = this.getFootprintScreenBounds(positions)
        const canvas = this.overview.scene.canvas
        const width = canvas.clientWidth
        const height = canvas.clientHeight

        if (!bounds || width <= 0 || height <= 0) {
            this.resetOverviewExtent(footprintRectangle)
            return
        }

        const widthRatio = bounds.width / width
        const heightRatio = bounds.height / height

        const sizeInvalid =
            widthRatio < this.minBoxRatio ||
            heightRatio < this.minBoxRatio ||
            widthRatio > this.maxBoxRatio ||
            heightRatio > this.maxBoxRatio

        if (sizeInvalid) {
            this.resetOverviewExtent(footprintRectangle)
            return
        }

        const touchesBoundary =
            bounds.left <= this.edgePadding ||
            bounds.top <= this.edgePadding ||
            bounds.right >= width - this.edgePadding ||
            bounds.bottom >= height - this.edgePadding

        if (touchesBoundary) {
            this.recenterOverview(footprintRectangle)
        }
    }

    private getFootprintScreenBounds(positions: Cartesian3[]): ScreenBounds | undefined {
        if (!this.overview) return undefined

        const pixels = positions
            .map(position => this.overview?.scene.cartesianToCanvasCoordinates(position))
            .filter((position): position is Cartesian2 => position !== undefined)

        if (pixels.length < 3) return undefined

        const left = Math.min(...pixels.map(position => position.x))
        const top = Math.min(...pixels.map(position => position.y))
        const right = Math.max(...pixels.map(position => position.x))
        const bottom = Math.max(...pixels.map(position => position.y))

        return {
            left,
            top,
            right,
            bottom,
            width: right - left,
            height: bottom - top
        }
    }

    /**
     * 将红框调整到鹰眼中的目标比例。
     */
    private resetOverviewExtent(footprintRectangle: Rectangle): void {
        if (!this.overview) return

        this.overview.camera.setView({
            destination: this.expandRectangle(footprintRectangle, this.scaleFactor)
        })

        this.overview.scene.requestRender()
    }

    /**
     * 保留鹰眼当前缩放比例，仅将鹰眼重新居中到红框。
     */
    private recenterOverview(footprintRectangle: Rectangle): void {
        if (!this.overview) return

        const ellipsoid = this.overview.scene.globe.ellipsoid
        const overviewRectangle = this.overview.camera.computeViewRectangle(ellipsoid)

        if (!overviewRectangle) {
            this.resetOverviewExtent(footprintRectangle)
            return
        }

        const center = Rectangle.center(footprintRectangle)

        this.overview.camera.setView({
            destination: this.createCenteredRectangle(center, overviewRectangle.width, overviewRectangle.height)
        })

        this.overview.scene.requestRender()
    }

    private expandRectangle(rectangle: Rectangle, factor: number): Rectangle {
        return this.createCenteredRectangle(
            Rectangle.center(rectangle),
            Math.min(rectangle.width * factor, CesiumMath.TWO_PI),
            Math.min(rectangle.height * factor, Math.PI)
        )
    }

    private createCenteredRectangle(center: Cartographic, width: number, height: number): Rectangle {
        const normalizedWidth = Math.min(Math.max(width, CesiumMath.EPSILON12), CesiumMath.TWO_PI)
        const normalizedHeight = Math.min(Math.max(height, CesiumMath.EPSILON12), Math.PI)
        const halfWidth = normalizedWidth * 0.5
        const halfHeight = normalizedHeight * 0.5

        let south = center.latitude - halfHeight
        let north = center.latitude + halfHeight

        if (south < -CesiumMath.PI_OVER_TWO) {
            north += -CesiumMath.PI_OVER_TWO - south
            south = -CesiumMath.PI_OVER_TWO
        }

        if (north > CesiumMath.PI_OVER_TWO) {
            south -= north - CesiumMath.PI_OVER_TWO
            north = CesiumMath.PI_OVER_TWO
        }

        const fullLongitude = normalizedWidth >= CesiumMath.TWO_PI - CesiumMath.EPSILON12
        const west = fullLongitude ? -Math.PI : CesiumMath.negativePiToPi(center.longitude - halfWidth)
        const east = fullLongitude ? Math.PI : CesiumMath.negativePiToPi(center.longitude + halfWidth)

        return new Rectangle(west, south, east, north)
    }

    private getRectangleFromPositions(positions: Cartesian3[]): Rectangle | undefined {
        if (positions.length < 3) return undefined

        const ellipsoid = this.mainViewer.scene.globe.ellipsoid
        const cartographics = positions.map(position => Cartographic.fromCartesian(position, ellipsoid))

        return Rectangle.fromCartographicArray(cartographics)
    }

    private createFootprint(overview: CesiumWidget, fillColor?: Color, outlineColor?: Color): Entity {
        return overview.entities.add({
            show: false,
            polygon: {
                hierarchy: new CallbackProperty(() => this.footprintValue, false),
                material: fillColor ?? Color.RED.withAlpha(0.16),
                outline: true,
                outlineColor: outlineColor ?? Color.RED,
                outlineWidth: 1,
                height: 1
            }
        })
    }

    /**
     * 监听鹰眼点击和红框拖动。
     */
    private syncOverviewToMain(): void {
        if (!this.overview) return

        this.overviewHandler?.destroy()
        this.overviewHandler = new ScreenSpaceEventHandler(this.overview.canvas)

        this.overviewHandler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
            if (!this.overview) return

            this.pointerMoved = false
            this.pointerDownPosition = Cartesian2.clone(movement.position)

            if (!this.isFootprintPicked(movement.position)) {
                this.isDraggingFootprint = false
                return
            }

            const position = this.pickOverviewPosition(movement.position)
            if (!position) return

            const ellipsoid = this.overview.scene.globe.ellipsoid

            this.isDraggingFootprint = true
            this.dragStartPosition = position
            this.dragStartFootprint = this.footprintValue.positions.map(item => Cartographic.fromCartesian(item, ellipsoid))
            this.overview.canvas.style.cursor = 'move'
        }, ScreenSpaceEventType.LEFT_DOWN)

        this.overviewHandler.setInputAction((movement: ScreenSpaceEventHandler.MotionEvent) => {
            if (!this.overview) return

            if (this.pointerDownPosition && Cartesian2.distance(this.pointerDownPosition, movement.endPosition) > 3) {
                this.pointerMoved = true
            }

            if (this.isDraggingFootprint) {
                this.updateDraggingFootprint(movement.endPosition)
                this.overview.canvas.style.cursor = 'move'
                return
            }

            this.overview.canvas.style.cursor = this.isFootprintPicked(movement.endPosition) ? 'move' : 'pointer'
        }, ScreenSpaceEventType.MOUSE_MOVE)

        this.overviewHandler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
            if (!this.overview) return

            if (this.isDraggingFootprint) {
                this.updateDraggingFootprint(movement.position)

                const center = this.getFootprintCenter()
                if (center) {
                    this.syncMainCamera(center)
                }

                this.resetOverviewInteraction()
                return
            }

            if (!this.pointerMoved) {
                const position = this.pickOverviewPosition(movement.position)

                if (position) {
                    this.syncMainCamera(position)
                }
            }

            this.resetOverviewInteraction()
        }, ScreenSpaceEventType.LEFT_UP)
    }

    private isFootprintPicked(position: Cartesian2): boolean {
        if (!this.overview || !this.footprintEntity) return false

        const picked = this.overview.scene.pick(position) as { id?: unknown } | undefined

        return picked?.id === this.footprintEntity
    }

    private pickOverviewPosition(position: Cartesian2): Cartographic | undefined {
        if (!this.overview) return undefined

        const ellipsoid = this.overview.scene.globe.ellipsoid
        const cartesian = this.overview.camera.pickEllipsoid(position, ellipsoid)

        if (!cartesian) return undefined

        return Cartographic.fromCartesian(cartesian, ellipsoid)
    }

    private updateDraggingFootprint(position: Cartesian2): void {
        if (!this.overview || !this.dragStartPosition || this.dragStartFootprint.length < 3) return

        const currentPosition = this.pickOverviewPosition(position)
        if (!currentPosition) return

        const ellipsoid = this.overview.scene.globe.ellipsoid
        const deltaLongitude = CesiumMath.negativePiToPi(currentPosition.longitude - this.dragStartPosition.longitude)
        const requestedLatitudeDelta = currentPosition.latitude - this.dragStartPosition.latitude
        const south = Math.min(...this.dragStartFootprint.map(item => item.latitude))
        const north = Math.max(...this.dragStartFootprint.map(item => item.latitude))
        const deltaLatitude = CesiumMath.clamp(requestedLatitudeDelta, -CesiumMath.PI_OVER_TWO - south, CesiumMath.PI_OVER_TWO - north)

        this.footprintValue.positions = this.dragStartFootprint.map(item => {
            const longitude = CesiumMath.negativePiToPi(item.longitude + deltaLongitude)
            const latitude = item.latitude + deltaLatitude

            return Cartesian3.fromRadians(longitude, latitude, item.height, ellipsoid)
        })

        this.overview.scene.requestRender()
    }

    private getFootprintCenter(): Cartographic | undefined {
        const rectangle = this.getRectangleFromPositions(this.footprintValue.positions)

        return rectangle ? Rectangle.center(rectangle) : undefined
    }

    /**
     * 移动主视图，并立即重新计算红框和鹰眼边界。
     */
    private syncMainCamera(position: Cartographic): void {
        if (this.mainViewer.isDestroyed()) return

        const camera = this.mainViewer.camera
        const ellipsoid = this.mainViewer.scene.globe.ellipsoid
        const height = Math.max(camera.positionCartographic.height, 1)

        camera.cancelFlight()
        camera.setView({
            destination: Cartesian3.fromRadians(position.longitude, position.latitude, height, ellipsoid),
            orientation: {
                heading: camera.heading,
                pitch: camera.pitch,
                roll: camera.roll
            }
        })

        Matrix4.clone(camera.viewMatrix, this.lastViewMatrix)

        this.mainViewer.scene.requestRender()
        this.update()
    }

    private resetOverviewInteraction(): void {
        this.isDraggingFootprint = false
        this.pointerMoved = false
        this.pointerDownPosition = undefined
        this.dragStartPosition = undefined
        this.dragStartFootprint = []

        if (this.overview && !this.overview.isDestroyed()) {
            this.overview.canvas.style.cursor = 'pointer'
        }
    }
}