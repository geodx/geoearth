import {
    CallbackPositionProperty, CallbackProperty, Cartesian3, Color, ConstantPositionProperty, CustomDataSource,
    EllipsoidGeodesic, Event, HeightReference, Plane, PolygonHierarchy,
    ScreenSpaceEventType, type Entity, type ScreenSpaceEventHandler, type Viewer,
} from 'cesium'
import type { ScreenEvent } from '../../events/modules/ScreenEvent'
import type { RemoveCallback, ScreenEventPayload } from '../../events/types'
import { getInclinedRectangle, getRectanglePoints } from '../../utils/geometry'
import { convertPosition } from './convertPosition'
import { pickPosition } from './pickPosition'
import {
    CoordinateType, DrawCancelledError,
    type DrawAngleOptions, type DrawAngleResult, type DrawAreaStyle, type DrawCircleOptions, type DrawCircleResult,
    type DrawHeightOptions, type DrawHeightResult, type DrawLineOptions, type DrawLineResult,
    type DrawPathStyle, type DrawPlaneOptions, type DrawPlaneResult, type DrawPointOptions,
    type DrawPolygonOptions, type DrawPolylineOptions, type DrawPosition,
    type DrawRectangleOptions, type DrawRectangleResult, type DrawTriangleOptions, type DrawTriangleResult,
} from './types'

interface DrawSession {
    reject: (reason: unknown) => void
    removers: RemoveCallback[]
    previousCursor: string
    finish?: () => boolean
}

type PathOptions<T extends CoordinateType> = DrawPathStyle & {
    coordinateType?: T
    onMove?: (positions: DrawPosition<T>[]) => void
}

/** 只采集坐标和显示临时预览；完成或取消均清理预览，结果实体由调用方管理。 */
export class DrawTool {
    readonly activeChanged = new Event<(active: boolean) => void>()
    private readonly dataSource = new CustomDataSource('geoearth-draw-preview')
    private session?: DrawSession
    private destroyed = false
    private taskSequence = 0

    constructor(private readonly viewer: Viewer, private readonly screenEvent: ScreenEvent) {
        const collection = viewer.dataSources
        void collection.add(this.dataSource).then(() => {
            // DataSourceCollection.add 是异步的，销毁不能留下迟到的预览数据源。
            if (this.destroyed && !collection.isDestroyed() && collection.contains(this.dataSource)) {
                collection.remove(this.dataSource, true)
            }
        })
    }

    get isActive(): boolean { return this.session !== undefined }

    /** 左键完成，右键取消。返回值与 onMove 都服从 coordinateType。 */
    drawPoint(): Promise<Cartesian3>
    drawPoint<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawPointOptions<T>): Promise<DrawPosition<T>>
    drawPoint<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawPointOptions<T> = {} as DrawPointOptions<T>): Promise<DrawPosition<T>> {
        return this.run((session, complete) => {
            let preview: Entity | undefined
            this.listen(session, ScreenSpaceEventType.LEFT_CLICK, payload => {
                const position = this.pick(payload, false)
                if (position) complete(this.convert(position, options.coordinateType))
            })
            this.listen(session, ScreenSpaceEventType.MOUSE_MOVE, payload => {
                const position = this.pick(payload, true)
                if (!position) {
                    if (preview) preview.show = false
                } else {
                    if (options.showPreview !== false) {
                        if (!preview) {
                            preview = this.dataSource.entities.add({
                                position, point: {
                                    pixelSize: options.pixelSize ?? 10,
                                    color: options.color ?? Color.CYAN,
                                    outlineColor: options.outlineColor ?? Color.WHITE,
                                    outlineWidth: options.outlineWidth ?? 2,
                                    heightReference: options.heightReference ?? HeightReference.NONE,
                                    disableDepthTestDistance: options.disableDepthTestDistance ?? Number.POSITIVE_INFINITY,
                                }
                            })
                        } else {
                            (preview.position as ConstantPositionProperty).setValue(position)
                            preview.show = true
                        }
                    }
                    options.onMove?.(this.convert(position, options.coordinateType))
                }
                this.viewer.scene.requestRender()
            })
            this.listen(session, ScreenSpaceEventType.RIGHT_CLICK, () => this.cancel())
        })
    }

    /** 两次左键确定线段；右键取消。 */
    drawLine(): Promise<DrawLineResult>
    drawLine<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawLineOptions<T>): Promise<DrawLineResult<T>>
    drawLine<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawLineOptions<T> = {} as DrawLineOptions<T>): Promise<DrawLineResult<T>> {
        return this.collect(options, 2, 2, 'line', points => this.convertAll(points, options.coordinateType) as DrawLineResult<T>)
    }

    /** 左键添加折线节点；右键或 finish() 完成，至少两个固定节点。 */
    drawPolyLine(): Promise<Cartesian3[]>
    drawPolyLine<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawPolylineOptions<T>): Promise<DrawPosition<T>[]>
    drawPolyLine<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawPolylineOptions<T> = {} as DrawPolylineOptions<T>): Promise<DrawPosition<T>[]> {
        return this.collect(options, 2, undefined, 'line', points => this.convertAll(points, options.coordinateType))
    }

    /** 三次左键采集一个角：起点、顶点、终点。只采点，不负责量测角度。 */
    drawAngle(): Promise<DrawAngleResult>
    drawAngle<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawAngleOptions<T>): Promise<DrawAngleResult<T>>
    drawAngle<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawAngleOptions<T> = {} as DrawAngleOptions<T>): Promise<DrawAngleResult<T>> {
        return this.collect(options, 3, 3, 'line', points => this.convertAll(points, options.coordinateType) as DrawAngleResult<T>)
    }

    /** 三次左键确定三角形；右键取消。不重复返回首点。 */
    drawTriangle(): Promise<DrawTriangleResult>
    drawTriangle<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawTriangleOptions<T>): Promise<DrawTriangleResult<T>>
    drawTriangle<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawTriangleOptions<T> = {} as DrawTriangleOptions<T>): Promise<DrawTriangleResult<T>> {
        return this.collect(options, 3, 3, 'area', points => this.convertAll(points, options.coordinateType) as DrawTriangleResult<T>)
    }

    /** 左键添加节点，右键或 finish() 完成；至少三点，不重复返回首点。 */
    drawPolygon(): Promise<Cartesian3[]>
    drawPolygon<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawPolygonOptions<T>): Promise<DrawPosition<T>[]>
    drawPolygon<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawPolygonOptions<T> = {} as DrawPolygonOptions<T>): Promise<DrawPosition<T>[]> {
        return this.collect(options, 3, undefined, 'area', points => this.convertAll(points, options.coordinateType))
    }

    /** 两次左键确定经纬线对齐矩形的对角点，返回四角。 */
    drawRectangle(): Promise<DrawRectangleResult>
    drawRectangle<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawRectangleOptions<T>): Promise<DrawRectangleResult<T>>
    drawRectangle<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawRectangleOptions<T> = {} as DrawRectangleOptions<T>): Promise<DrawRectangleResult<T>> {
        return this.collect(options, 2, 2, 'area', points => this.convertAll(points, options.coordinateType) as DrawRectangleResult<T>,
            points => points.length < 2 ? [] : getRectanglePoints(points[0], points[1], this.viewer.scene.globe.ellipsoid))
    }

    /** 前两点确定底边，第三次左键确定宽度和方向，返回局部斜矩形四角。 */
    drawInclinedRectangle(): Promise<DrawRectangleResult>
    drawInclinedRectangle<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawRectangleOptions<T>): Promise<DrawRectangleResult<T>>
    drawInclinedRectangle<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawRectangleOptions<T> = {} as DrawRectangleOptions<T>): Promise<DrawRectangleResult<T>> {
        return this.collect(options, 3, 3, 'area', points => this.convertAll(points, options.coordinateType) as DrawRectangleResult<T>,
            points => points.length < 3 ? [] : getInclinedRectangle(points[0], points[1], points[2], this.viewer.scene.globe.ellipsoid))
    }

    /** 两次左键：圆心、圆周点。第二次点击重新计算半径，不依赖此前是否移动鼠标。 */
    drawCircle(): Promise<DrawCircleResult>
    drawCircle<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawCircleOptions<T>): Promise<DrawCircleResult<T>>
    drawCircle<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawCircleOptions<T> = {} as DrawCircleOptions<T>): Promise<DrawCircleResult<T>> {
        const ellipsoid = this.viewer.scene.globe.ellipsoid
        let radius = 0
        let center: Cartesian3 | undefined
        const calculate = (points: Cartesian3[]): DrawCircleResult<T> => {
            const a = ellipsoid.cartesianToCartographic(points[0])
            const b = ellipsoid.cartesianToCartographic(points[1])
            radius = new EllipsoidGeodesic(a, b, ellipsoid).surfaceDistance
            return { center: this.convert(points[0], options.coordinateType), endPoint: this.convert(points[1], options.coordinateType), radius }
        }
        return this.collect({
            ...options, clampToGround: options.clampToGround ?? true, onMove: points => {
                if (points.length >= 2) options.onMove?.({ center: points[0], endPoint: points[1], radius })
            }
        }, 2, 2, 'line', calculate, points => {
            if (points.length >= 2 && calculate(points).radius < 1e-6) throw new RangeError('Circle radius must be non-zero.')
            return points
        }, () => {
            if (options.showPreview === false) return
            this.dataSource.entities.add({
                position: new CallbackPositionProperty(() => center, false),
                ellipse: {
                    show: new CallbackProperty(() => Boolean(center) && radius > 0, false),
                    semiMajorAxis: new CallbackProperty(() => Math.max(radius, 0.01), false),
                    semiMinorAxis: new CallbackProperty(() => Math.max(radius, 0.01), false),
                    material: options.fillColor ?? (options.color ?? Color.CYAN).withAlpha(0.3),
                    height: new CallbackProperty(() => center && options.clampToGround === false
                        ? ellipsoid.cartesianToCartographic(center).height : 0, false),
                    heightReference: options.clampToGround === false ? HeightReference.NONE : HeightReference.CLAMP_TO_GROUND,
                },
            })
            // 圆心和半径随输入更新，半径连线仍使用公共预览。
            return points => {
                center = points[0]
                if (points.length < 2) radius = 0
            }
        })
    }

    /** 两次左键采集高差控制点；高度取自拾取值，不做额外地形采样或测量标注。 */
    drawHeightDifference(): Promise<DrawHeightResult>
    drawHeightDifference<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawHeightOptions<T>): Promise<DrawHeightResult<T>>
    drawHeightDifference<T extends CoordinateType = CoordinateType.CARTESIAN3>(options: DrawHeightOptions<T> = {} as DrawHeightOptions<T>): Promise<DrawHeightResult<T>> {
        const calculate = (points: Cartesian3[]): DrawHeightResult<T> => {
            const ellipsoid = this.viewer.scene.globe.ellipsoid
            const a = ellipsoid.cartesianToCartographic(points[0])
            const b = ellipsoid.cartesianToCartographic(points[1])
            const end = Cartesian3.fromRadians(a.longitude, a.latitude, b.height, ellipsoid)
            return {
                start: this.convert(points[0], options.coordinateType), end: this.convert(end, options.coordinateType),
                pickedEnd: this.convert(points[1], options.coordinateType), heightDifference: b.height - a.height
            }
        }
        return this.collect({
            ...options, clampToGround: false, onMove: points => {
                if (points.length >= 2) options.onMove?.(calculate(points.map(position => this.toCartesian(position, options.coordinateType))))
            }
        }, 2, 2, 'line', calculate, undefined, () => {
            let vertical: Cartesian3[] = []
            if (options.showPreview !== false) this.dataSource.entities.add({
                polyline: {
                    positions: new CallbackProperty(() => vertical, false), width: options.width ?? 3, material: options.color ?? Color.CYAN,
                }
            })
            return points => {
                if (points.length < 2) { vertical = []; return }
                const result = calculate(points)
                vertical = [points[0], this.toCartesian(result.end, options.coordinateType)]
            }
        })
    }

    /** 拖动平面后松开左键完成，右键取消；保证恢复原有相机输入状态。 */
    drawYPlane(options: DrawPlaneOptions): Promise<DrawPlaneResult> {
        return this.run((session, complete) => {
            const { position, normal, dimensions } = options
            const metersPerPixel = options.metersPerPixel ?? 1
            if (![position.x, position.y, position.z, normal.x, normal.y, normal.z, dimensions.x, dimensions.y,
                metersPerPixel, options.distance ?? 0].every(Number.isFinite)
                || Cartesian3.magnitude(normal) < 1e-12 || dimensions.x <= 0 || dimensions.y <= 0 || metersPerPixel <= 0) {
                throw new RangeError('Plane position, normal, dimensions and metersPerPixel must be valid.')
            }
            const unitNormal = Cartesian3.normalize(normal, new Cartesian3())
            let distance = options.distance ?? 0
            let dragging = false
            const controller = this.viewer.scene.screenSpaceCameraController
            const previousInputs = controller.enableInputs
            const snapshot = (): DrawPlaneResult => ({ position: Cartesian3.clone(position), normal: Cartesian3.clone(unitNormal), distance })
            const entity = this.dataSource.entities.add({
                position: Cartesian3.clone(position), plane: {
                    dimensions, plane: new CallbackProperty(() => new Plane(unitNormal, distance), false),
                    material: options.color ?? Color.BLUE.withAlpha(0.5), outline: true, outlineColor: Color.WHITE,
                }
            })
            session.removers.push(() => { if (dragging) controller.enableInputs = previousInputs })
            session.finish = () => { complete(snapshot()); return true }
            this.listen(session, ScreenSpaceEventType.LEFT_DOWN, payload => {
                const event = payload as ScreenSpaceEventHandler.PositionedEvent
                if (this.viewer.scene.pick(event.position)?.id !== entity) return
                dragging = true
                controller.enableInputs = false
            })
            this.listen(session, ScreenSpaceEventType.MOUSE_MOVE, payload => {
                if (!dragging) return
                const event = payload as ScreenSpaceEventHandler.MotionEvent
                distance += (event.startPosition.y - event.endPosition.y) * metersPerPixel
                options.onMove?.(snapshot())
                this.viewer.scene.requestRender()
            })
            this.listen(session, ScreenSpaceEventType.LEFT_UP, () => {
                if (dragging) complete(snapshot())
            })
            this.listen(session, ScreenSpaceEventType.RIGHT_CLICK, () => this.cancel())
        })
    }

    /** 完成当前采集；可变节点图形节点不足时返回 false，并继续绘制。 */
    finish(): boolean {
        const session = this.session
        if (!session?.finish) return false
        try { return session.finish() } catch (error) { this.fail(session, error); return false }
    }

    cancel(message = 'Drawing was cancelled.'): boolean {
        const session = this.session
        if (!session) return false
        this.cleanup(session)
        session.reject(new DrawCancelledError(message))
        return true
    }

    /** 清空临时预览；正在采集时同时取消任务，避免留下不可见的活动任务。 */
    clearPreview(): void {
        if (this.session) { this.cancel('Drawing preview was cleared.'); return }
        this.dataSource.entities.removeAll()
        if (!this.viewer.isDestroyed()) this.viewer.scene.requestRender()
    }

    destroy(): void {
        if (this.destroyed) return
        this.destroyed = true
        this.cancel('DrawTool has been destroyed.')
        if (this.viewer.dataSources.contains(this.dataSource)) this.viewer.dataSources.remove(this.dataSource, true)
    }

    private run<TResult>(setup: (session: DrawSession, complete: (result: TResult) => void) => void): Promise<TResult> {
        if (this.destroyed || this.viewer.isDestroyed()) return Promise.reject(new Error('DrawTool has been destroyed.'))
        const taskId = ++this.taskSequence
        this.cancel('A new drawing operation has started.')
        if (taskId !== this.taskSequence) return Promise.reject(new DrawCancelledError('A new drawing operation has started.'))
        return new Promise<TResult>((resolve, reject) => {
            const session: DrawSession = { reject, removers: [], previousCursor: this.viewer.scene.canvas.style.cursor }
            this.session = session
            this.viewer.scene.canvas.style.cursor = 'crosshair'
            const complete = (result: TResult) => {
                if (this.session !== session) return
                this.cleanup(session)
                resolve(result)
            }
            try {
                this.activeChanged.raiseEvent(true)
                // activeChanged 的业务回调可能立即取消或开启另一次绘制。
                if (this.session === session) {
                    setup(session, complete)
                    this.viewer.scene.requestRender()
                }
            } catch (error) { this.fail(session, error) }
        })
    }

    private listen(session: DrawSession, type: ScreenSpaceEventType, callback: (payload: ScreenEventPayload) => void): void {
        session.removers.push(this.screenEvent.addEventListener(type, payload => {
            if (this.session !== session) return
            try { callback(payload) } catch (error) { this.fail(session, error) }
        }))
    }

    private fail(session: DrawSession, error: unknown): void {
        if (this.session !== session) return
        this.cleanup(session)
        session.reject(error)
    }

    private cleanup(session: DrawSession): void {
        if (this.session !== session) return
        this.session = undefined
        session.removers.splice(0).forEach(remove => remove())
        this.clearPreview()
        this.viewer.scene.canvas.style.cursor = session.previousCursor
        this.activeChanged.raiseEvent(false)
    }

    private pick(payload: ScreenEventPayload, moving: boolean): Cartesian3 | undefined {
        const position = moving
            ? (payload as ScreenSpaceEventHandler.MotionEvent).endPosition
            : (payload as ScreenSpaceEventHandler.PositionedEvent).position
        return pickPosition(this.viewer, position, this.dataSource.entities)
    }

    private convert<T extends CoordinateType>(position: Cartesian3, type?: T): DrawPosition<T> {
        return convertPosition(position, (type ?? CoordinateType.CARTESIAN3) as T, this.viewer.scene.globe.ellipsoid)
    }
    private convertAll<T extends CoordinateType>(points: Cartesian3[], type?: T): DrawPosition<T>[] {
        return points.map(position => this.convert(position, type))
    }
    private toCartesian<T extends CoordinateType>(position: DrawPosition<T>, type?: T): Cartesian3 {
        if (type === CoordinateType.DEGREES) {
            const p = position as DrawPosition<CoordinateType.DEGREES>
            return Cartesian3.fromDegrees(p.longitude, p.latitude, p.height, this.viewer.scene.globe.ellipsoid)
        }
        if (type === CoordinateType.CARTOGRAPHIC) return this.viewer.scene.globe.ellipsoid.cartographicToCartesian(position as DrawPosition<CoordinateType.CARTOGRAPHIC>)
        return Cartesian3.clone(position as Cartesian3)
    }

    private hasArea(points: Cartesian3[]): boolean {
        if (points.length < 3) return false
        const area = new Cartesian3()
        for (let i = 1; i < points.length - 1; i++) {
            const a = Cartesian3.subtract(points[i], points[0], new Cartesian3())
            const b = Cartesian3.subtract(points[i + 1], points[0], new Cartesian3())
            Cartesian3.add(area, Cartesian3.cross(a, b, new Cartesian3()), area)
        }
        return Cartesian3.magnitude(area) > 1e-6
    }

    private collect<T extends CoordinateType, TResult>(
        options: PathOptions<T> & DrawAreaStyle, minimum: number, maximum: number | undefined,
        kind: 'line' | 'area', result: (positions: Cartesian3[]) => TResult,
        shape: (points: Cartesian3[]) => Cartesian3[] = points => points,
        extraPreview?: () => ((points: Cartesian3[]) => void) | void,
    ): Promise<TResult> {
        return this.run((session, complete) => {
            const fixed: Cartesian3[] = []
            let visible: Cartesian3[] = []
            const clamp = options.clampToGround ?? kind === 'area'
            const extra = extraPreview?.()
            if (options.showPreview !== false) {
                this.dataSource.entities.add({
                    polyline: {
                        positions: new CallbackProperty(() => kind === 'area' && visible.length >= 3 ? [...visible, visible[0]] : visible, false),
                        width: options.width ?? 3, material: options.outlineColor ?? options.color ?? Color.CYAN, clampToGround: clamp,
                    }
                })
                if (kind === 'area') this.dataSource.entities.add({
                    polygon: {
                    hierarchy: new CallbackProperty(() => this.hasArea(visible) ? new PolygonHierarchy(visible) : undefined, false),
                        material: options.fillColor ?? (options.color ?? Color.CYAN).withAlpha(0.3),
                        perPositionHeight: !clamp,
                    }
                })
            }
            const update = (points: Cartesian3[], notify: boolean) => {
                try { visible = shape(points) } catch (error) {
                    // 鼠标与底边共线、矩形暂时没有宽度时，不终止整个绘制任务。
                    if (!(error instanceof RangeError)) throw error
                    visible = []
                }
                if (extra) extra(points)
                if (notify && visible.length) options.onMove?.(this.convertAll(visible, options.coordinateType))
                this.viewer.scene.requestRender()
            }
            const finish = (): boolean => {
                if (fixed.length < minimum) return false
                let positions: Cartesian3[]
                try { positions = shape(fixed) } catch (error) {
                    if (error instanceof RangeError) return false
                    throw error
                }
                if (kind === 'area') {
                    if (positions.length > 3 && Cartesian3.distance(positions[0], positions[positions.length - 1]) < 1e-6) positions = positions.slice(0, -1)
                    if (!this.hasArea(positions)) return false
                }
                complete(result(positions))
                return true
            }
            session.finish = finish
            this.listen(session, ScreenSpaceEventType.LEFT_CLICK, payload => {
                const position = this.pick(payload, false)
                if (!position) return
                if (fixed.length && Cartesian3.distance(fixed[fixed.length - 1], position) < 1e-6) return
                fixed.push(Cartesian3.clone(position))
                if (maximum && fixed.length === maximum) {
                    if (finish()) return
                    fixed.pop()
                    return
                }
                if (options.showPreview !== false && options.showVertex !== false) this.dataSource.entities.add({
                    position, point: {
                        color: options.color ?? Color.CYAN, pixelSize: 8,
                        heightReference: clamp ? HeightReference.CLAMP_TO_GROUND : HeightReference.NONE,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    }
                })
                update(fixed, false)
            })
            this.listen(session, ScreenSpaceEventType.MOUSE_MOVE, payload => {
                if (!fixed.length) return
                const position = this.pick(payload, true)
                update(position ? [...fixed, Cartesian3.clone(position)] : fixed, Boolean(position))
            })
            this.listen(session, ScreenSpaceEventType.RIGHT_CLICK, () => {
                if (maximum || !finish()) this.cancel(`A ${kind === 'area' ? 'polygon' : 'line'} requires at least ${minimum === 2 ? 'two' : 'three'} points.`)
            })
        })
    }
}
