import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
    CallbackProperty, Cartesian2, Cesium3DTileFeature, Color, ConstantProperty, CustomDataSource,
    DataSourceCollection, Entity, EntityCollection, Event, JulianDate, PointPrimitiveCollection,
    Primitive, PrimitiveCollection, ScreenSpaceEventType
} from 'cesium'
import { InteractionManage, InteractionEventType } from '../dist/index.js'

// 使用真实 Cesium Entity / Property / 集合 / Event；GPU 拾取由浏览器示例验证。
let frameId = 0
const frames = new Map()
globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId }
globalThis.cancelAnimationFrame = id => frames.delete(id)
function flushFrames() { const callbacks = [...frames.values()]; frames.clear(); for (const callback of callbacks) callback() }

function setup() {
    const listeners = new Map()
    const screen = {
        addEventListener(type, callback) {
            if (!listeners.has(type)) listeners.set(type, new Set())
            listeners.get(type).add(callback)
            return () => listeners.get(type).delete(callback)
        },
        emit(type, payload) { for (const callback of [...(listeners.get(type) ?? [])]) callback(payload) }
    }
    const actions = new Map([[ScreenSpaceEventType.LEFT_CLICK, () => {}]])
    const nativeClick = actions.get(ScreenSpaceEventType.LEFT_CLICK)
    const canvasEvents = new Map()
    const scene = {
        canvas: {
            addEventListener: (type, callback) => canvasEvents.set(type, callback),
            removeEventListener: type => canvasEvents.delete(type)
        },
        primitives: new PrimitiveCollection(), groundPrimitives: new PrimitiveCollection(),
        postRender: new Event(), requestRender() {}, picked: undefined, stack: [], picks: 0,
        pick() { this.picks++; return this.picked },
        drillPick(_position, limit) { return this.stack.slice(0, limit) }
    }
    const viewer = {
        scene, clock: { currentTime: JulianDate.now() }, entities: new EntityCollection(),
        dataSources: new DataSourceCollection(), selectedEntityChanged: new Event(),
        screenSpaceEventHandler: {
            getInputAction: type => actions.get(type),
            setInputAction: (callback, type) => actions.set(type, callback),
            removeInputAction: type => actions.delete(type)
        }
    }
    let selected
    Object.defineProperty(viewer, 'selectedEntity', {
        get: () => selected,
        set: value => { selected = value; viewer.selectedEntityChanged.raiseEvent(value) }
    })
    const draw = { isActive: false, activeChanged: new Event() }
    const events = []
    const interaction = new InteractionManage(viewer, screen, { raiseEvent: (_type, event) => events.push(event) }, draw)
    const point = viewer.entities.add({ id: 'point', name: '测试点', point: { color: Color.WHITE },
        properties: { name: '<script>示例</script>', height: 10 } })
    const position = new Cartesian2(10, 20)
    const click = () => screen.emit(ScreenSpaceEventType.LEFT_CLICK, { position })
    const move = () => screen.emit(ScreenSpaceEventType.MOUSE_MOVE, { endPosition: position })
    const color = () => point.point.color.getValue(viewer.clock.currentTime)
    return { interaction, viewer, scene, screen, draw, point, position, click, move, color, events,
        actions, nativeClick, canvasEvents, listeners }
}

test('默认不接管选择；重复 enable 不重复监听，disable 恢复原生处理并保留业务监听', () => {
    const c = setup()
    c.viewer.selectedEntity = c.point
    assert.equal(c.interaction.selected, undefined)
    c.interaction.enable(); c.interaction.enable()
    assert.equal(c.listeners.get(ScreenSpaceEventType.LEFT_CLICK).size, 1)
    assert.equal(c.actions.has(ScreenSpaceEventType.LEFT_CLICK), false)
    let business = 0
    c.screen.addEventListener(ScreenSpaceEventType.LEFT_CLICK, () => business++)
    c.interaction.disable(); c.click()
    assert.equal(c.actions.get(ScreenSpaceEventType.LEFT_CLICK), c.nativeClick)
    assert.equal(business, 1)
    c.interaction.destroy()
})

test('悬停按帧合并，重复对象不重复通知，mouseleave 取消待执行拾取', () => {
    const c = setup()
    c.interaction.enable(); c.scene.picked = { id: c.point }
    c.move(); c.move(); c.move(); flushFrames()
    assert.equal(c.scene.picks, 1)
    assert.equal(c.interaction.hovered.object, c.point)
    c.move(); flushFrames()
    assert.equal(c.events.filter(e => e.type === InteractionEventType.HOVER_CHANGE).length, 1)
    c.move(); c.canvasEvents.get('mouseleave')(); flushFrames()
    assert.equal(c.scene.picks, 2)
    assert.equal(c.interaction.hovered, undefined)
    c.interaction.destroy()
})

test('手动高亮 > 选中 > 悬停，逐级恢复动态颜色的原 Property 引用', () => {
    const c = setup()
    const dynamic = new CallbackProperty(() => Color.LIME, false)
    c.point.point.color = dynamic
    c.interaction.enable(); c.scene.picked = { id: c.point }
    c.move(); flushFrames()
    assert.ok(Color.equals(c.color(), Color.fromCssColorString('#67e8f9')))
    c.click()
    assert.ok(Color.equals(c.color(), Color.fromCssColorString('#fbbf24')))
    assert.equal(c.interaction.highlight(c.point), true)
    assert.ok(Color.equals(c.color(), Color.fromCssColorString('#f97316')))
    c.interaction.clearHighlight()
    assert.ok(Color.equals(c.color(), Color.fromCssColorString('#fbbf24')))
    c.interaction.clearSelection()
    assert.ok(Color.equals(c.color(), Color.fromCssColorString('#67e8f9')))
    c.interaction.clearHover()
    assert.equal(c.point.point.color, dynamic)
    c.interaction.destroy()
})

test('高亮期间业务替换 Property，清理保留业务新值', () => {
    const c = setup()
    c.interaction.highlight(c.point)
    const updated = new ConstantProperty(Color.BLUE)
    c.point.point.color = updated
    c.interaction.clearHighlight()
    assert.equal(c.point.point.color, updated)
    c.interaction.destroy()
})

test('空白点击与原生属性框关闭清除选中；属性转义并恢复 description', () => {
    const c = setup()
    c.interaction.enable(); c.interaction.select(c.point)
    assert.equal(c.viewer.selectedEntity, c.point)
    assert.match(c.point.description.getValue(), /&lt;script&gt;示例&lt;\/script&gt;/)
    c.interaction.select(c.point)
    assert.equal(c.events.filter(e => e.type === InteractionEventType.SELECT_CHANGE).length, 1)
    c.viewer.selectedEntity = undefined
    assert.equal(c.interaction.selected, undefined)
    assert.equal(c.point.description, undefined)
    c.interaction.select(c.point); c.click()
    assert.equal(c.viewer.selectedEntity, undefined)
    c.interaction.destroy()
})

test('pick 的 filter 可穿过前方对象，drillPick 去重并复制屏幕坐标', () => {
    const c = setup()
    const other = new Entity({ id: 'other' })
    c.scene.stack = [{ id: other }, { id: c.point }, { id: c.point }]
    c.interaction.enable({ filter: result => result.id === 'point' })
    const result = c.interaction.pick(c.position)
    assert.equal(result.object, c.point)
    assert.equal(c.interaction.drillPick(c.position).length, 2)
    c.position.x = 999
    assert.equal(result.position.x, 10)
    c.interaction.destroy()
})

test('Entity 移除一起清理全部状态并恢复原样式，允许重新加入', () => {
    const c = setup()
    const original = c.point.point.color
    c.interaction.enable(); c.scene.picked = { id: c.point }
    c.move(); flushFrames(); c.click(); c.interaction.highlight(c.point)
    c.viewer.entities.remove(c.point)
    assert.equal(c.interaction.hovered, undefined)
    assert.equal(c.interaction.selected, undefined)
    assert.equal(c.interaction.highlighted, undefined)
    assert.equal(c.point.point.color, original)
    c.viewer.entities.add(c.point)
    assert.equal(c.point.description, undefined)
    c.interaction.destroy()
})

test('DataSource 整体移除清理选中', async () => {
    const c = setup()
    const source = new CustomDataSource('data')
    const entity = source.entities.add({ point: { pixelSize: 10 } })
    await c.viewer.dataSources.add(source)
    c.interaction.select(entity)
    c.viewer.dataSources.remove(source)
    assert.equal(c.interaction.selected, undefined)
    c.interaction.destroy()
})

test('绘制暂停自身输入；完成点击不会选中，微任务恢复；销毁不残留监听', async () => {
    const c = setup()
    c.interaction.enable(); c.scene.picked = { id: c.point }
    let business = 0
    c.screen.addEventListener(ScreenSpaceEventType.LEFT_CLICK, () => business++)
    c.draw.isActive = true; c.draw.activeChanged.raiseEvent(true); c.click()
    assert.equal(c.interaction.selected, undefined)
    assert.equal(business, 1)
    assert.equal(c.actions.has(ScreenSpaceEventType.LEFT_CLICK), false)
    c.draw.isActive = false; c.draw.activeChanged.raiseEvent(false); c.click()
    assert.equal(c.interaction.selected, undefined)
    await Promise.resolve(); c.click()
    assert.equal(c.interaction.selected.object, c.point)
    c.draw.activeChanged.raiseEvent(false); c.interaction.destroy()
    await Promise.resolve()
    assert.equal(c.listeners.get(ScreenSpaceEventType.LEFT_CLICK).size, 1)
    assert.equal(c.scene.postRender.numberOfListeners, 0)
    assert.equal(c.viewer.selectedEntityChanged.numberOfListeners, 0)
})

test('feature 属性与原色恢复，tileUnload 清理选择和高亮', () => {
    const c = setup()
    let color = Color.WHITE.clone()
    const tileset = { tileUnload: new Event(), isDestroyed: () => false }
    const content = { tileset, featuresLength: 1, batchTable: {
        getColor: (_id, result) => Color.clone(color, result),
        setColor: (_id, value) => { color = value.clone() },
        getPropertyIds: () => ['name', 'height'], getProperty: (_id, name) => name === 'name' ? '建筑' : 200
    } }
    const feature = new Cesium3DTileFeature(content, 0)
    content.getFeature = () => feature
    c.interaction.select(feature)
    assert.equal(c.interaction.selected.type, 'feature')
    assert.equal(c.interaction.selected.properties.height, 200)
    c.interaction.highlight(feature)
    tileset.tileUnload.raiseEvent({ content })
    assert.equal(c.interaction.selected, undefined)
    assert.equal(c.interaction.highlighted, undefined)
    assert.ok(Color.equals(color, Color.WHITE))
    assert.equal(tileset.tileUnload.numberOfListeners, 0)
    c.interaction.destroy()
})

test('颜色对象所在嵌套集合销毁，清理全部状态并避免写回已销毁子对象', () => {
    const c = setup()
    const nested = c.scene.primitives.add(new PrimitiveCollection())
    const points = nested.add(new PointPrimitiveCollection())
    const point = points.add({ color: Color.WHITE })
    const raw = { primitive: point, id: 'point-primitive' }
    c.interaction.select(raw); c.interaction.highlight(raw)
    c.scene.primitives.remove(nested)
    assert.equal(c.interaction.selected, undefined)
    assert.equal(c.interaction.highlighted, undefined)
    c.interaction.destroy()
})

test('自定义适配器移除后恢复原色，不支持的 Primitive 返回 false', () => {
    const c = setup()
    const object = { tint: Color.WHITE }
    const target = { primitive: object }
    assert.equal(c.interaction.highlight(target), false)
    const remove = c.interaction.registerHighlightAdapter({
        supports: result => result.primitive === object,
        apply: (_result, color) => { const original = object.tint; object.tint = color; return () => { object.tint = original } }
    })
    assert.equal(c.interaction.highlight(target), true)
    assert.ok(Color.equals(object.tint, Color.fromCssColorString('#f97316')))
    remove()
    assert.equal(object.tint, Color.WHITE)
    assert.equal(c.interaction.highlight({ primitive: new Primitive(), id: 'not-ready' }), false)
    c.interaction.destroy()
})

test('getProperties 重新读取属性，保留旧结果快照', () => {
    const c = setup()
    const result = c.interaction.select(c.point)
    c.point.properties.height = 20
    assert.equal(result.properties.height, 10)
    assert.equal(c.interaction.getProperties(result).height, 20)
    c.interaction.destroy()
})

test('线面高亮后恢复原有动态材质和业务 description', () => {
    const c = setup()
    const entity = c.viewer.entities.add({ polyline: { positions: [], material: Color.BLUE }, description: '原说明' })
    const material = entity.polyline.material
    const dynamic = new CallbackProperty(() => Color.BLUE, false)
    material.color = dynamic
    const description = entity.description
    c.interaction.select(entity)
    assert.notEqual(entity.polyline.material, material)
    c.interaction.clearSelection()
    assert.equal(entity.polyline.material, material)
    assert.equal(entity.polyline.material.color, dynamic)
    assert.equal(entity.description, description)
    c.interaction.destroy()
})

test('PointPrimitive 单独移除后在渲染事件中清理选择和手动高亮', () => {
    const c = setup()
    const points = c.scene.primitives.add(new PointPrimitiveCollection())
    const point = points.add({ color: Color.WHITE })
    const target = { primitive: point }
    c.interaction.select(target); c.interaction.highlight(target)
    points.remove(point); c.scene.postRender.raiseEvent()
    assert.equal(c.interaction.selected, undefined)
    assert.equal(c.interaction.highlighted, undefined)
    c.interaction.destroy()
})
