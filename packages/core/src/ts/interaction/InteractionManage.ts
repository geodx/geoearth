import {
    BillboardCollection, Cartesian2, Cesium3DTileFeature, ConstantProperty, Entity, LabelCollection,
    PointPrimitiveCollection, PolylineCollection, PrimitiveCollection, ScreenSpaceEventType,
    type Color, type ScreenSpaceEventHandler, type Viewer
} from 'cesium'
import type { ScreenEvent } from '../events/modules/ScreenEvent'
import type { InteractionEvent } from '../events/modules/InteractionEvent'
import type { RemoveCallback } from '../events/types'
import type { DrawTool } from '../tools/draw/DrawTool'
import { pickPosition } from '../tools/draw/pickPosition'
import { HighlightManage, highlightColor } from './HighlightManage'
import { isPickAlive, propertyDescription, samePick, toPickResult } from './pickObject'
import {
    InteractionEventType, type HighlightAdapter, type HighlightColor, type InteractionOptions,
    type InteractionTarget, type PickResult
} from './types'

/** 对象交互入口。自动交互按需开启；pick/select/highlight 也可独立使用。 */
export class InteractionManage {
    private readonly highlights: HighlightManage
    private readonly removeInputs: RemoveCallback[] = []
    private readonly removeObservers: RemoveCallback[] = []
    private readonly removeTargetObservers: RemoveCallback[] = []
    private options: InteractionOptions = {}
    private hoverColor = highlightColor('#67e8f9')
    private selectColor = highlightColor('#fbbf24')
    private manualColor = highlightColor('#f97316')
    private enabled = false
    private destroyed = false
    private hoveredResult?: PickResult
    private selectedResult?: PickResult
    private highlightedResult?: PickResult
    private changingSelectedEntity = false
    private restoreDescription?: () => void
    private nativeClick?: ScreenSpaceEventHandler.PositionedEventCallback
    private hoverFrame?: number
    private hoverPosition?: Cartesian2

    private readonly handleMouseLeave = () => { this.cancelHoverFrame(); this.setHover(undefined) }

    constructor(
        private readonly viewer: Viewer,
        private readonly screen: ScreenEvent,
        private readonly events: InteractionEvent,
        private readonly draw: DrawTool
    ) {
        this.highlights = new HighlightManage(viewer.scene)
        this.removeObservers.push(
            viewer.selectedEntityChanged.addEventListener(entity => {
                if (this.changingSelectedEntity) return
                if (!this.enabled && !this.selectedResult) return
                // 保持原生属性框关闭按钮、业务直接设置 selectedEntity 与 SDK 状态一致。
                const feature = (entity as Entity & { feature?: InteractionTarget })?.feature
                this.setSelection(entity ? toPickResult(viewer, feature ?? entity) : undefined, false)
            }),
            draw.activeChanged.addEventListener(active => {
                this.unbindInputs()
                if (active) this.setHover(undefined)
                // 绘制完成的那次点击仍在派发，下一微任务才恢复拾取监听。
                else queueMicrotask(() => { if (this.enabled && !this.destroyed && !draw.isActive) this.bindInputs() })
            }),
            viewer.dataSources.dataSourceRemoved.addEventListener((_collection, source) => {
                this.removeTargets(result => result.type === 'entity' &&
                    result.object.entityCollection === source.entities)
            }),
            viewer.scene.postRender.addEventListener(() => this.removeTargets(result => !isPickAlive(result)))
        )
    }

    get isEnabled(): boolean { return this.enabled }
    get hovered(): PickResult | undefined { return this.hoveredResult }
    get selected(): PickResult | undefined { return this.selectedResult }
    get highlighted(): PickResult | undefined { return this.highlightedResult }

    /** 可重复调用以修改选项。重用 ScreenEvent，只保存和移除本模块自己的监听。 */
    enable(options: InteractionOptions = {}): void {
        const hoverColor = highlightColor(options.hoverColor ?? '#67e8f9')
        const selectColor = highlightColor(options.selectColor ?? '#fbbf24')
        this.options = { hover: true, select: true, ...options }
        this.hoverColor = hoverColor
        this.selectColor = selectColor
        if (!this.enabled) {
            // Viewer 自带点击选中，接管期间暂存它，避免一次点击执行两套选择逻辑。
            const handler = this.viewer.screenSpaceEventHandler
            this.nativeClick = handler.getInputAction(ScreenSpaceEventType.LEFT_CLICK) as ScreenSpaceEventHandler.PositionedEventCallback
            handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK)
            this.viewer.scene.canvas.addEventListener('mouseleave', this.handleMouseLeave)
            this.enabled = true
        }
        this.unbindInputs()
        if (!this.options.hover) this.setHover(undefined)
        if (!this.selectedResult && this.viewer.selectedEntity) {
            const entity = this.viewer.selectedEntity as Entity & { feature?: InteractionTarget }
            this.setSelection(toPickResult(this.viewer, entity.feature ?? entity))
        }
        if (!this.draw.isActive) this.bindInputs()
        this.refreshHighlights()
    }

    /** 停止自动交互、清空状态并恢复 Viewer 原来的点击行为。 */
    disable(): void {
        this.enabled = false
        this.unbindInputs()
        this.viewer.scene.canvas.removeEventListener('mouseleave', this.handleMouseLeave)
        if (this.nativeClick) {
            this.viewer.screenSpaceEventHandler.setInputAction(this.nativeClick, ScreenSpaceEventType.LEFT_CLICK)
            this.nativeClick = undefined
        }
        this.clearHover()
        this.clearSelection()
        this.clearHighlight()
    }

    /** 获取最前方符合过滤条件的对象；没有对象时返回 undefined。 */
    pick(position: Cartesian2): PickResult | undefined {
        if (this.options.filter) return this.drillPick(position).find(this.options.filter)
        const raw = this.viewer.scene.pick(position)
        return raw ? toPickResult(this.viewer, raw, position) : undefined
    }

    /** 获取该屏幕位置由前到后的对象列表，按对象身份去重。 */
    drillPick(position: Cartesian2, limit?: number): PickResult[] {
        const results: PickResult[] = []
        for (const raw of this.viewer.scene.drillPick(position, limit)) {
            const result = toPickResult(this.viewer, raw, position)
            if (!results.some(item => samePick(item, result))) results.push(result)
        }
        return results
    }

    select(target: InteractionTarget): PickResult {
        const result = toPickResult(this.viewer, target)
        this.setSelection(result)
        return result
    }

    clearSelection(): void { this.setSelection(undefined) }
    clearHover(): void { this.cancelHoverFrame(); this.setHover(undefined) }

    /** 手动高亮独立于选中；返回是否有适配器实际修改了样式。 */
    highlight(target: InteractionTarget, color: HighlightColor = '#f97316'): boolean {
        this.manualColor = highlightColor(color)
        const result = toPickResult(this.viewer, target)
        const previous = this.highlightedResult
        this.highlightedResult = result
        this.refreshHighlights()
        this.observeTargets()
        if (!samePick(previous, result)) this.notify(InteractionEventType.HIGHLIGHT_CHANGE, previous, result)
        return this.highlights.has(result)
    }

    clearHighlight(): void {
        const previous = this.highlightedResult
        if (!previous) return
        this.highlightedResult = undefined
        this.refreshHighlights()
        this.observeTargets()
        this.notify(InteractionEventType.HIGHLIGHT_CHANGE, previous, undefined)
    }

    /** 自定义适配器优先于内置适配器；移除前恢复它管理的样式。 */
    registerHighlightAdapter(adapter: HighlightAdapter): RemoveCallback {
        this.highlights.clear()
        const remove = this.highlights.registerAdapter(adapter)
        this.refreshHighlights()
        return () => {
            if (this.destroyed) { remove(); return }
            this.highlights.clear()
            remove()
            this.refreshHighlights()
        }
    }

    /** 重新读取动态 Entity 属性或 feature metadata。 */
    getProperties(target: InteractionTarget): Record<string, unknown> {
        const result = toPickResult(this.viewer, target)
        return toPickResult(this.viewer, result.object).properties
    }

    destroy(): void {
        if (this.destroyed) return
        this.destroyed = true
        this.disable()
        for (const remove of this.removeTargetObservers.splice(0)) remove()
        for (const remove of this.removeObservers.splice(0)) remove()
    }

    private bindInputs(): void {
        if (this.options.hover) {
            this.removeInputs.push(this.screen.addEventListener(ScreenSpaceEventType.MOUSE_MOVE, payload => {
                const event = payload as ScreenSpaceEventHandler.MotionEvent
                this.hoverPosition = Cartesian2.clone(event.endPosition, this.hoverPosition)
                // 同一帧内的鼠标移动只拾取最后一个位置，避免重复读取 GPU。
                if (this.hoverFrame !== undefined) return
                this.hoverFrame = requestAnimationFrame(() => {
                    this.hoverFrame = undefined
                    this.setHover(this.pick(this.hoverPosition))
                })
            }))
        }
        if (this.options.select) {
            this.removeInputs.push(this.screen.addEventListener(ScreenSpaceEventType.LEFT_CLICK, payload => {
                const event = payload as ScreenSpaceEventHandler.PositionedEvent
                this.setSelection(this.pick(event.position))
            }))
        }
    }

    private unbindInputs(): void {
        this.cancelHoverFrame()
        for (const remove of this.removeInputs.splice(0)) remove()
    }

    private cancelHoverFrame(): void {
        if (this.hoverFrame !== undefined) cancelAnimationFrame(this.hoverFrame)
        this.hoverFrame = undefined
    }

    private setHover(result?: PickResult): void {
        const previous = this.hoveredResult
        if (samePick(previous, result)) return
        this.hoveredResult = result
        this.refreshHighlights()
        this.observeTargets()
        this.notify(InteractionEventType.HOVER_CHANGE, previous, result)
    }

    private setSelection(result?: PickResult, updateViewer = true): void {
        const previous = this.selectedResult
        if (samePick(previous, result)) return
        this.selectedResult = result
        this.syncSelectedEntity(result, updateViewer)
        this.refreshHighlights()
        this.observeTargets()
        this.notify(InteractionEventType.SELECT_CHANGE, previous, result)
    }

    private syncSelectedEntity(result: PickResult | undefined, updateViewer: boolean): void {
        this.restoreDescription?.()
        this.restoreDescription = undefined
        if (updateViewer) {
            this.changingSelectedEntity = true
            try { this.viewer.selectedEntity = result ? this.selectionEntity(result) : undefined }
            finally { this.changingSelectedEntity = false }
        }
    }

    private selectionEntity(result: PickResult): Entity {
        if (result.type === 'entity') {
            const entity = result.object
            if (!entity.description) {
                const description = new ConstantProperty(propertyDescription(result.properties))
                entity.description = description
                this.restoreDescription = () => { if (entity.description === description) entity.description = undefined }
            }
            return entity
        }
        // 模型/feature 没有 Entity，借用原生 InfoBox，不另建弹窗组件。
        return new Entity({ name: result.name ?? String(result.id ?? result.type),
            // 复用绘制的空间位置拾取，让 feature 也能使用原生选中标记和定位按钮。
            position: result.position ? pickPosition(this.viewer, result.position) : undefined,
            description: propertyDescription(result.properties) })
    }

    private refreshHighlights(): void {
        const states: { result: PickResult; color: Color }[] = []
        if (this.hoveredResult) states.push({ result: this.hoveredResult, color: this.hoverColor })
        if (this.selectedResult) states.push({ result: this.selectedResult, color: this.selectColor })
        if (this.highlightedResult) states.push({ result: this.highlightedResult, color: this.manualColor })
        this.highlights.update(states)
    }

    private notify(type: InteractionEventType, previous?: PickResult, current?: PickResult): void {
        this.events.raiseEvent(type, { type, previous, current })
    }

    private removeTargets(matches: (result: PickResult) => boolean): void {
        const hover = this.hoveredResult && matches(this.hoveredResult) ? this.hoveredResult : undefined
        const selected = this.selectedResult && matches(this.selectedResult) ? this.selectedResult : undefined
        const highlighted = this.highlightedResult && matches(this.highlightedResult) ? this.highlightedResult : undefined
        if (!hover && !selected && !highlighted) return
        // 同一对象可能同时悬停、选中和手动高亮，必须一起清掉再更新样式。
        if (hover) this.hoveredResult = undefined
        if (selected) { this.selectedResult = undefined; this.syncSelectedEntity(undefined, true) }
        if (highlighted) this.highlightedResult = undefined
        this.refreshHighlights()
        this.observeTargets()
        if (hover) this.notify(InteractionEventType.HOVER_CHANGE, hover, undefined)
        if (selected) this.notify(InteractionEventType.SELECT_CHANGE, selected, undefined)
        if (highlighted) this.notify(InteractionEventType.HIGHLIGHT_CHANGE, highlighted, undefined)
    }

    /** 只观察当前交互对象，集合移除或瓦片卸载时及时清理引用与高亮。 */
    private observeTargets(): void {
        for (const remove of this.removeTargetObservers.splice(0)) remove()
        const collections = new Set<Entity['entityCollection']>()
        const tilesets = new Set<Cesium3DTileFeature['tileset']>()
        for (const result of [this.hoveredResult, this.selectedResult, this.highlightedResult]) {
            if (!result) continue
            if (result.type === 'entity') {
                const collection = result.object.entityCollection
                if (collection) collections.add(collection)
            }
            if (result.object instanceof Cesium3DTileFeature) tilesets.add(result.object.tileset)
        }
        for (const collection of collections) {
            this.removeTargetObservers.push(collection.collectionChanged.addEventListener((_collection, _added, removed) => {
                this.removeTargets(result => removed.includes(result.object as Entity))
            }))
        }
        for (const tileset of tilesets) {
            this.removeTargetObservers.push(tileset.tileUnload.addEventListener(tile => {
                const contains = (content: typeof tile.content, feature: Cesium3DTileFeature): boolean =>
                    (feature.featureId < content.featuresLength && content.getFeature(feature.featureId) === feature) ||
                    (content.innerContents ?? []).some(child => contains(child, feature))
                // tileUnload 在 content 销毁前触发，此时仍可以安全恢复 feature.color。
                this.removeTargets(result => result.object instanceof Cesium3DTileFeature && contains(tile.content, result.object))
            }))
        }
        for (const result of [this.hoveredResult, this.selectedResult, this.highlightedResult]) {
            if (result?.primitive && result.type !== 'entity') {
                this.observePrimitive(this.viewer.scene.primitives, result)
                this.observePrimitive(this.viewer.scene.groundPrimitives, result)
            }
        }
    }

    /** 逐层订阅对象所在的集合，嵌套集合整体销毁时也不会留下悬空选择。 */
    private observePrimitive(collection: PrimitiveCollection, result: PickResult): boolean {
        for (let index = 0; index < collection.length; index++) {
            const child = collection.get(index)
            let ownsTarget = child === result.primitive
            if (child instanceof PrimitiveCollection) ownsTarget = this.observePrimitive(child, result) || ownsTarget
            if (child instanceof BillboardCollection || child instanceof LabelCollection ||
                child instanceof PointPrimitiveCollection || child instanceof PolylineCollection) {
                if (child.contains(result.primitive)) {
                    ownsTarget = true
                    // 这些集合没有逐对象 remove 事件，渲染后用公开 contains 检查。
                    this.removeTargetObservers.push(this.viewer.scene.postRender.addEventListener(() => {
                        if (child.isDestroyed() || !child.contains(result.primitive)) {
                            if (child.isDestroyed()) this.highlights.discard(result)
                            this.removeTargets(item => samePick(item, result))
                        }
                    }))
                }
            }
            if (!ownsTarget) continue
            this.removeTargetObservers.push(collection.primitiveRemoved.addEventListener(removed => {
                if (removed === child) {
                    if (child.isDestroyed?.()) this.highlights.discard(result)
                    this.removeTargets(item => samePick(item, result))
                }
            }))
            return true
        }
        return false
    }
}
