import {
    CallbackProperty,
    Cartesian3, Color, CustomDataSource, ScreenSpaceEventHandler, ScreenSpaceEventType,
    type Viewer
} from 'cesium'
import type { ScreenEvent } from '../../events/modules/ScreenEvent'
import type { EventCallback, RemoveCallback, ScreenEventPayload } from '../../events/types'
import { convertPosition } from './convertPosition'
import { pickPosition } from './pickPosition'
import { CoordinateType, DrawCancelledError, DrawLineOptions, DrawPosition, type DrawPointOptions } from './types'
import { EntityFactory } from '../../visualization'

export class DrawTool {

    private readonly dataSource = new CustomDataSource('geoearth-draw-preview')
    private readonly removeCallbacks: RemoveCallback[] = []
    // private previewPoint?: Entity
    // private previewPosition?: ConstantPositionProperty

    private rejectDrawing?: (reason: unknown) => void
    private previousCursor = ''
    private active = false

    constructor(private readonly viewer: Viewer, private readonly screenEvent: ScreenEvent) {
        void this.viewer.dataSources.add(this.dataSource)
    }

    get isActive(): boolean {
        return this.active
    }

    /**
     * 画点
     * 
     * 左键完成，右键取消。
     * 
     * 返回坐标
     */
    drawPoint<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawPointOptions<T>): Promise<DrawPosition<T>> {
        this.beginDrawing()
        return new Promise<DrawPosition<T>>((resolve, reject) => {
            this.rejectDrawing = reject
            try {
                this.addInputListener(ScreenSpaceEventType.LEFT_CLICK, payload => {
                    try {
                        const event = payload as ScreenSpaceEventHandler.PositionedEvent
                        const position = pickPosition(this.viewer, event.position)
                        if (!position) return
                        const result = this.convertResult(position, options)
                        this.completeDrawing(result, resolve)
                    } catch (error) {
                        this.failDrawing(error)
                    }
                })

                this.addInputListener(ScreenSpaceEventType.MOUSE_MOVE, payload => {
                    try {
                        const event = payload as ScreenSpaceEventHandler.MotionEvent
                        const position = pickPosition(this.viewer, event.endPosition)

                        if (!position) return

                        options.onMove?.(this.convertResult(position, options))
                    } catch (error) {
                        this.failDrawing(error)
                    }
                })

                this.addInputListener(ScreenSpaceEventType.RIGHT_CLICK, () => {
                    this.cancel()
                })
            } catch (error) {
                this.failDrawing(error)
            }
        })
    }

    /**
     * 绘制折线。
     *
     * 左键添加节点，右键完成绘制。
     * 返回固定节点坐标，不保留临时预览实体。
     */
    drawLine<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawLineOptions<T> = {}): Promise<DrawPosition<T>[]> {
        this.beginDrawing()

        return new Promise<DrawPosition<T>[]>((resolve, reject) => {
            this.rejectDrawing = reject

            const fixedPositions: Cartesian3[] = []
            let movingPosition: Cartesian3 | undefined
            let previewCreated = false

            const getPreviewPositions = (): Cartesian3[] => {
                if (!movingPosition) {
                    return fixedPositions
                }

                return [...fixedPositions, movingPosition]
            }

            const createPreview = (): void => {
                if (previewCreated) return

                this.dataSource.entities.add({
                    polyline: {
                        positions: new CallbackProperty(getPreviewPositions, false),
                        width: options.width ?? 3,
                        material: options.color ?? Color.GREEN,
                        clampToGround: options.clampToGround ?? false
                    }
                })

                previewCreated = true
            }

            try {
                this.addInputListener(ScreenSpaceEventType.LEFT_CLICK, payload => {
                    try {
                        const event = payload as ScreenSpaceEventHandler.PositionedEvent
                        const position = pickPosition(this.viewer, event.position)

                        if (!position) return

                        const fixedPosition = Cartesian3.clone(position)
                        fixedPositions.push(fixedPosition)
                        movingPosition = undefined

                        createPreview()

                        if (options.showVertex ?? true) {
                            this.dataSource.entities.add(EntityFactory.createPoint(fixedPosition))
                        }
                    } catch (error) {
                        this.failDrawing(error)
                    }
                })

                this.addInputListener(ScreenSpaceEventType.MOUSE_MOVE, payload => {
                    try {
                        if (fixedPositions.length === 0) return

                        const event = payload as ScreenSpaceEventHandler.MotionEvent
                        const position = pickPosition(this.viewer, event.endPosition)

                        if (!position) return

                        movingPosition = Cartesian3.clone(position)
                        createPreview()

                        const positions = getPreviewPositions().map(item => this.convertResult(item, options))
                        options.onMove?.(positions)
                    } catch (error) {
                        this.failDrawing(error)
                    }
                })

                this.addInputListener(ScreenSpaceEventType.RIGHT_CLICK, () => {
                    try {
                        if (fixedPositions.length < 2) {
                            this.cancel('A line requires at least two points.')
                            return
                        }

                        const result = fixedPositions.map(position => this.convertResult(position, options))
                        this.completeDrawing(result, resolve)
                    } catch (error) {
                        this.failDrawing(error)
                    }
                })
            } catch (error) {
                this.failDrawing(error)
            }
        })
    }


    /**
    * 取消当前绘制。
    */
    cancel(message = 'Drawing was cancelled.'): boolean {
        if (!this.active) return false
        const error = new DrawCancelledError(message)
        const reject = this.rejectDrawing

        this.cleanupDrawing()

        reject?.(error)

        return true
    }
    /**
     * 清除绘制过程中的临时实体。
     */
    clearPreview(): void {
        this.dataSource.entities.removeAll()

        // this.coordinates = []; 
        // // 已经确定位置的几何形节点
        // this.dynamicNodesPoint = [];
        // // 绘制的实体
        // this.drawEntities = undefined;
    }

    /**
     * 销毁 DrawTool 持有的临时资源。
     * 
     */
    destroy() {
        if (this.active) {
            this.cancel('DrawTool has been destroyed.')
        } else {
            this.cleanupDrawing()
        }
        if (this.viewer.dataSources.contains(this.dataSource)) {
            this.viewer.dataSources.remove(this.dataSource, true)
        }
    }



    //#region drawing private
    // 画图前的一些准备工作
    private beginDrawing() {
        if (this.active) {
            this.cancel('A new drawing operation has started.')
        }
        // 清除已经绘制的 entity
        this.clearPreview();
        // 销毁事件句柄
        this.removeInputListeners()

        // 改变鼠标样式
        this.setDrawingCursor()
        this.active = true

    }
    /**
     * 正常完成绘制。
     *
     * 先清理状态再 resolve，确保调用方可以立即开始下一次绘制。
     */
    private completeDrawing<TResult>(result: TResult, resolve: (result: TResult) => void): void {
        this.cleanupDrawing()
        resolve(result)
    }
    /**
     * 绘制过程中发生异常。
     */
    private failDrawing(error: unknown): void {
        if (!this.active) return

        const reject = this.rejectDrawing

        this.cleanupDrawing()
        reject?.(error)
    }
    /**
     * 完成、取消和异常共用的清理逻辑。
     */
    private cleanupDrawing() {
        const wasActive = this.active
        // 销毁事件句柄
        this.removeInputListeners()
        // 清除已经绘制的 entity
        this.clearPreview();
        // 恢复鼠标样式
        if (wasActive) {
            this.restoreCursor()
        }
        this.rejectDrawing = undefined
        this.active = false
    }
    private setDrawingCursor(): void {
        const canvas = this.viewer.scene.canvas

        this.previousCursor = canvas.style.cursor
        canvas.style.cursor = 'crosshair'
    }

    private restoreCursor(): void {
        this.viewer.scene.canvas.style.cursor = this.previousCursor
        this.previousCursor = ''
    }

    private addInputListener(type: ScreenSpaceEventType, callback: EventCallback<ScreenEventPayload>): void {
        const removeCallback = this.screenEvent.addEventListener(type, callback)
        this.removeCallbacks.push(removeCallback)
    }
    private removeInputListeners(): void {
        for (const removeCallback of this.removeCallbacks.splice(0)) {
            removeCallback()
        }
    }

    private convertResult<T extends CoordinateType>(position: Cartesian3, options: { coordinateType?: T }): DrawPosition<T> {
        const coordinateType = options.coordinateType ?? CoordinateType.CARTESIAN3

        return convertPosition(position, coordinateType as T, this.viewer.scene.globe.ellipsoid)
    }

    //#endregion

    //#region Preview Entity
    private updatePreviewPoint<T extends CoordinateType>(position: Cartesian3, options: DrawPointOptions<T>): void {
        // if (!this.previewPoint) {
        //     this.previewPosition = new ConstantPositionProperty(Cartesian3.clone(position))

        //     this.previewPoint = this.dataSource.entities.add({
        //         position: this.previewPosition,
        //         point: {
        //             pixelSize: options.pixelSize ?? 10,
        //             color: options.color ?? Color.CYAN,
        //             outlineColor: options.outlineColor ?? Color.WHITE,
        //             outlineWidth: options.outlineWidth ?? 2,
        //             heightReference: options.heightReference ?? HeightReference.NONE,
        //             disableDepthTestDistance: options.disableDepthTestDistance ?? Number.POSITIVE_INFINITY
        //         }
        //     })

        //     return
        // }

        // this.previewPosition?.setValue(Cartesian3.clone(position))
    }
    //#endregion
}