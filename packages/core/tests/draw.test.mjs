import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { Cartesian2, Cartesian3, Cartographic, CustomDataSource, DataSourceCollection, Ellipsoid, HeightReference, JulianDate, Math as CesiumMath, ScreenSpaceEventType } from 'cesium'

async function load(entry) {
    const bundle = await build({ configFile: false, logLevel: 'silent', build: {
        write: false, minify: false, lib: { entry: fileURLToPath(new URL(entry, import.meta.url)), formats: ['es'] },
        rolldownOptions: { external: ['cesium'] },
    } })
    const outputs = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(result => result.output)
    const code = outputs.find(item => item.type === 'chunk' && item.isEntry).code
        .replace(/from (["'])cesium\1/g, `from ${JSON.stringify(import.meta.resolve('cesium'))}`)
    return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const { DrawTool, CoordinateType, DrawCancelledError } = await load('../src/ts/tools/draw/index.ts')
const { getRectanglePoints, getInclinedRectangle } = await load('../src/ts/utils/geometry/index.ts')
const { EntityFactory } = await load('../src/ts/visualization/entities/index.ts')
const point = (lon, lat, height = 100) => Cartesian3.fromDegrees(lon, lat, height)
const a = point(110, 30), b = point(110.01, 30.01), c = point(110.02, 30.005), d = point(111, 31)

test('圆、矩形和多边形的完成结果可交给工厂保留，后续绘制取消不清除已有结果', async t => {
    const x = await setup(t)
    const results = new CustomDataSource('draw-results')
    await x.viewer.dataSources.add(results)
    const circleTask = x.draw.drawCircle()
    x.click(a); x.click(b)
    const circle = await circleTask
    results.entities.add(EntityFactory.createCircle(circle.center, circle.radius))
    x.clean()
    for (const method of ['drawRectangle', 'drawPolygon']) {
        const task = x.draw[method]()
        x.click(a); x.click(b)
        if (method === 'drawPolygon') { x.click(c); x.right() }
        results.entities.add(EntityFactory.createPolygon(await task))
        x.clean()
    }
    const cancelled = x.draw.drawCircle(), rejected = assert.rejects(cancelled, DrawCancelledError)
    x.click(a); x.draw.cancel(); await rejected
    x.clean()
    assert.equal(results.entities.values.length, 3)
    assert.equal(results.entities.values.filter(entity => entity.polygon).length, 2)
    assert.equal(results.entities.values.filter(entity => entity.ellipse).length, 1)
})

test('多边形工厂只在展示边线闭合，不修改返回节点；非贴地模式保留顶点高度', () => {
    const positions = [a, b, c]
    const entity = EntityFactory.createPolygon(positions, { clampToGround: false })
    assert.equal(positions.length, 3)
    assert.deepEqual(entity.polygon.hierarchy.getValue().positions, positions)
    assert.equal(entity.polygon.perPositionHeight.getValue(), true)
    assert.equal(entity.polyline.clampToGround.getValue(), false)
    const line = entity.polyline.positions.getValue()
    assert.equal(line.length, 4)
    assert.ok(Cartesian3.equals(line[0], line[3]))
    assert.throws(() => EntityFactory.createPolygon([a, b]), /至少/)
})

test('普通圆面直接使用米制半径，不生成高度连线；可选择贴地或保持圆心高度', () => {
    const ground = EntityFactory.createCircle(a, 500)
    assert.equal(ground.ellipse.semiMajorAxis.getValue(), 500)
    assert.equal(ground.ellipse.semiMinorAxis.getValue(), 500)
    assert.equal(ground.ellipse.heightReference.getValue(), HeightReference.CLAMP_TO_GROUND)
    assert.equal(ground.polyline, undefined)
    const elevated = EntityFactory.createCircle(a, 500, { clampToGround: false })
    assert.ok(Math.abs(elevated.ellipse.height.getValue() - 100) < 1e-6)
    assert.equal(elevated.ellipse.heightReference.getValue(), HeightReference.NONE)
    assert.throws(() => EntityFactory.createCircle(a, 0), /半径/)
    assert.throws(() => EntityFactory.createCircle(a, NaN), /半径/)
})

// 使用真实 Cesium 图形、集合及数学对象；仅替代屏幕输入、GPU 拾取和相机。
async function setup(t) {
    const listeners = new Map()
    const screen = {
        addEventListener(type, callback) {
            if (!listeners.has(type)) listeners.set(type, new Set())
            listeners.get(type).add(callback)
            return () => listeners.get(type).delete(callback)
        },
        emit(type, payload) { for (const callback of [...(listeners.get(type) ?? [])]) callback(payload) },
    }
    let renders = 0
    const scene = {
        canvas: { style: { cursor: 'grab' } }, globe: { ellipsoid: Ellipsoid.WGS84, pick: () => undefined },
        pickPositionSupported: true, pickPosition: position => position.world,
        pick: position => position.picked, screenSpaceCameraController: { enableInputs: true },
        requestRender() { renders++ },
    }
    const viewer = { scene, dataSources: new DataSourceCollection(), isDestroyed: () => false,
        camera: { getPickRay: () => ({}), pickEllipsoid: () => undefined }, clock: { currentTime: JulianDate.now() } }
    const draw = new DrawTool(viewer, screen)
    await Promise.resolve()
    const source = viewer.dataSources.get(0)
    const click = world => screen.emit(ScreenSpaceEventType.LEFT_CLICK, { position: { world } })
    const move = world => screen.emit(ScreenSpaceEventType.MOUSE_MOVE, { endPosition: { world } })
    const right = () => screen.emit(ScreenSpaceEventType.RIGHT_CLICK, {})
    const clean = () => {
        assert.equal(draw.isActive, false)
        assert.equal(source.entities.values.length, 0)
        assert.equal(scene.canvas.style.cursor, 'grab')
        for (const callbacks of listeners.values()) assert.equal(callbacks.size, 0)
    }
    t.after(() => draw.destroy())
    return { draw, scene, viewer, source, screen, click, move, right, clean, renders: () => renders }
}

test('点默认返回 Cartesian3；完成前清除预览、恢复光标和监听', async t => {
    const x = await setup(t)
    const task = x.draw.drawPoint()
    x.move(a); x.move(b)
    assert.equal(x.source.entities.values.length, 1)
    x.click(c)
    assert.ok(Cartesian3.equals(await task, c)); x.clean()
})

test('角度和弧度返回值、移动回调一致，修改回调快照不污染固定节点', async t => {
    const x = await setup(t)
    const task = x.draw.drawPolyLine({ coordinateType: CoordinateType.DEGREES, onMove: points => { points[0].longitude = 0 } })
    x.click(a); x.move(b); x.click(c); x.right()
    const result = await task
    assert.equal(result.length, 2); assert.ok(Math.abs(result[0].longitude - 110) < 1e-9)
    const radians = x.draw.drawPoint({ coordinateType: CoordinateType.CARTOGRAPHIC })
    x.click(a); assert.ok(Math.abs((await radians).longitude - CesiumMath.toRadians(110)) < 1e-12)
    x.clean()
})

test('线段在第二次左键完成，使用最终点击，不依赖鼠标移动', async t => {
    const x = await setup(t); const task = x.draw.drawLine()
    x.click(a); x.move(b); x.click(c)
    const positions = await task
    assert.equal(positions.length, 2); assert.ok(Cartesian3.equals(positions[1], c)); x.clean()
})

test('折线只返回固定节点；finish 节点不足时保持活动，右键不足时取消', async t => {
    const x = await setup(t); const task = x.draw.drawPolyLine()
    x.click(a); assert.equal(x.draw.finish(), false); assert.equal(x.draw.isActive, true)
    x.click(b); x.move(c); assert.equal(x.draw.finish(), true)
    assert.deepEqual(await task, [a, b]); x.clean()
    const cancelled = x.draw.drawPolyLine(); const rejected = assert.rejects(cancelled, DrawCancelledError)
    x.click(a); x.right(); await rejected; x.clean()
})

test('多边形至少三点，返回未闭合坐标；三角形和角各固定三次点击', async t => {
    const x = await setup(t); const task = x.draw.drawPolygon()
    x.click(a); x.click(b); assert.equal(x.draw.finish(), false)
    x.click(c); x.move(d); x.right(); assert.deepEqual(await task, [a, b, c]); x.clean()
    for (const method of ['drawTriangle', 'drawAngle']) {
        const next = x.draw[method](); x.click(a); x.click(b); x.click(c)
        assert.deepEqual(await next, [a, b, c]); x.clean()
    }
})

test('圆在第二次点击计算半径，中心与圆周点都遵循坐标格式', async t => {
    const x = await setup(t); const task = x.draw.drawCircle({ coordinateType: CoordinateType.DEGREES })
    x.click(point(0, 0)); x.move(point(0.5, 0)); x.click(point(1, 0))
    const result = await task
    assert.ok(Math.abs(result.radius - 111319.490793) < 0.01)
    assert.ok(Math.abs(result.center.longitude) < 1e-10)
    assert.ok(Math.abs(result.endPoint.longitude - 1) < 1e-10); x.clean()
})

test('圆不移动鼠标也能完成；同经纬度无半径时继续等待有效控制点', async t => {
    const x = await setup(t); const task = x.draw.drawCircle()
    x.click(a); x.click(point(110, 30, 500)); assert.equal(x.draw.isActive, true)
    x.click(b); assert.ok((await task).radius > 0); x.clean()
})

test('矩形返回四角；斜矩形使用第三次真实点击，而非旧的预览宽度', async t => {
    const x = await setup(t); const task = x.draw.drawRectangle()
    x.click(a); x.click(b); assert.equal((await task).length, 4); x.clean()
    const tilted = x.draw.drawInclinedRectangle()
    x.click(a); x.click(b); x.move(d); x.click(c)
    assert.deepEqual(await tilted, getInclinedRectangle(a, b, c)); x.clean()
})

test('矩形暂时零宽、斜矩形暂时共线时不终止任务', async t => {
    const x = await setup(t); const task = x.draw.drawRectangle()
    x.click(a); x.move(point(110, 31)); assert.equal(x.draw.isActive, true)
    x.click(b); await task; x.clean()
    const tilted = x.draw.drawInclinedRectangle()
    x.click(a); x.click(b); x.move(a); assert.equal(x.draw.isActive, true)
    x.click(c); await tilted; x.clean()
})

test('高差使用第二次真实点击的椭球高，保留符号且竖线同经纬度', async t => {
    const x = await setup(t); const task = x.draw.drawHeightDifference({ coordinateType: CoordinateType.DEGREES })
    x.click(point(110, 30, 100)); x.move(point(111, 31, 200)); x.click(point(112, 32, 50))
    const result = await task
    assert.ok(Math.abs(result.heightDifference + 50) < 1e-6)
    assert.ok(Math.abs(result.end.longitude - result.start.longitude) < 1e-10)
    assert.ok(Math.abs(result.end.latitude - result.start.latitude) < 1e-10)
    assert.ok(Math.abs(result.pickedEnd.longitude - 112) < 1e-10); x.clean()
})

test('showPreview:false 不创建临时实体但仍回调；输入后请求重绘', async t => {
    const x = await setup(t); let calls = 0
    const task = x.draw.drawPolygon({ showPreview: false, onMove: () => calls++ })
    x.click(a); const renders = x.renders(); x.move(b)
    assert.equal(x.source.entities.values.length, 0); assert.equal(calls, 1)
    assert.ok(x.renders() > renders); x.click(b); x.click(c); x.right(); await task; x.clean()
})

test('取消、替换和回调异常均拒绝 Promise 并清理，不破坏外部实体', async t => {
    const x = await setup(t); const first = x.draw.drawPoint()
    const rejection = assert.rejects(first, DrawCancelledError)
    const next = x.draw.drawLine(); await rejection
    x.click(a); x.click(b); await next; x.clean()
    const task = x.draw.drawPoint({ onMove() { throw new Error('callback failure') } })
    const failed = assert.rejects(task, /callback failure/); x.move(a); await failed; x.clean()
})

test('activeChanged 中立即取消不会注册迟到监听或留下悬空 Promise', async t => {
    const x = await setup(t)
    const stop = x.draw.activeChanged.addEventListener(active => { if (active) x.draw.cancel() })
    await assert.rejects(x.draw.drawPoint(), DrawCancelledError); stop(); x.clean()
})

test('activeChanged 清理回调开启新任务时，外层旧请求不能覆盖它', async t => {
    const x = await setup(t); const first = x.draw.drawPoint()
    const firstRejected = assert.rejects(first, DrawCancelledError)
    let inner
    const stop = x.draw.activeChanged.addEventListener(active => { if (!active && !inner) inner = x.draw.drawPoint() })
    const outer = x.draw.drawLine(); await assert.rejects(outer, DrawCancelledError); await firstRejected
    stop(); x.click(a); assert.ok(Cartesian3.equals(await inner, a)); x.clean()
})

function planeOptions() { return { position: a, normal: new Cartesian3(0, 0, 2), dimensions: new Cartesian2(100, 200), metersPerPixel: 2, distance: 10 } }
function startDrag(x) {
    const entity = x.source.entities.values.find(entity => entity.plane)
    x.screen.emit(ScreenSpaceEventType.LEFT_DOWN, { position: { picked: { id: entity } } })
    x.screen.emit(ScreenSpaceEventType.MOUSE_MOVE, { startPosition: new Cartesian2(0, 100), endPosition: new Cartesian2(0, 80) })
}

test('平面拖动返回标准化法线与米制距离，松手完成并恢复原相机状态', async t => {
    const x = await setup(t); x.scene.screenSpaceCameraController.enableInputs = false
    const task = x.draw.drawYPlane(planeOptions()); startDrag(x)
    x.screen.emit(ScreenSpaceEventType.LEFT_UP, {})
    const result = await task
    assert.equal(result.distance, 50); assert.equal(result.normal.z, 1)
    assert.equal(x.scene.screenSpaceCameraController.enableInputs, false); x.clean()
})

test('平面取消、回调异常及 destroy 都恢复相机输入', async t => {
    const x = await setup(t)
    for (const mode of ['cancel', 'error', 'destroy']) {
        const task = x.draw.drawYPlane({ ...planeOptions(), onMove: mode === 'error' ? () => { throw new Error('plane callback') } : undefined })
        const rejected = assert.rejects(task)
        startDrag(x)
        if (mode === 'cancel') x.draw.cancel()
        if (mode === 'destroy') x.draw.destroy()
        await rejected; assert.equal(x.scene.screenSpaceCameraController.enableInputs, true)
    }
    x.draw.destroy(); await assert.rejects(x.draw.drawPoint(), /destroyed/)
})

test('销毁发生在数据源异步登记前，不遗留数据源', async () => {
    const viewer = { dataSources: new DataSourceCollection(), isDestroyed: () => false }
    const draw = new DrawTool(viewer, {})
    draw.destroy(); await Promise.resolve(); await Promise.resolve()
    assert.equal(viewer.dataSources.length, 0)
})

test('命中自己的预览点时回退 Globe，不把预览本身当成新的地表高度', async t => {
    const x = await setup(t); const task = x.draw.drawPoint(); x.move(a)
    const preview = x.source.entities.values[0]
    x.scene.globe.pick = () => b
    x.screen.emit(ScreenSpaceEventType.LEFT_CLICK, { position: { picked: { id: preview }, world: c } })
    assert.ok(Cartesian3.equals(await task, b)); x.clean()
})

test('矩形跨日期变更线采用短区间，统一高度，输入保持不变', () => {
    const start = point(179, 10, 123), end = point(-179, 12, 500)
    const before = Cartesian3.clone(start)
    const corners = getRectanglePoints(start, end).map(p => Cartographic.fromCartesian(p))
    assert.equal(corners.length, 4)
    assert.ok(corners.every(p => Math.abs(Math.abs(CesiumMath.toDegrees(p.longitude)) - 179) < 1e-8))
    assert.ok(corners.every(p => Math.abs(p.height - 123) < 1e-6)); assert.ok(Cartesian3.equals(start, before))
})

test('局部斜矩形底边与侧边正交，四角在同一平面，退化输入明确拒绝', () => {
    const result = getInclinedRectangle(a, b, c)
    const base = Cartesian3.subtract(result[1], result[0], new Cartesian3())
    const side = Cartesian3.subtract(result[3], result[0], new Cartesian3())
    assert.ok(Math.abs(Cartesian3.dot(base, side)) < 1e-5)
    assert.ok(Cartesian3.equalsEpsilon(Cartesian3.subtract(result[2], result[1], new Cartesian3()), side, 1e-8))
    assert.throws(() => getInclinedRectangle(a, a, b), RangeError)
    assert.throws(() => getRectanglePoints(a, a), RangeError)
})

test('清除活动预览同时取消任务；不能留下没有预览的活动输入', async t => {
    const x = await setup(t); const task = x.draw.drawPolyLine()
    const rejected = assert.rejects(task, DrawCancelledError)
    x.click(a); x.move(b); x.draw.clearPreview(); await rejected; x.clean()
})

test('多边形显式闭合时去掉重复首点；退化三角形继续等待有效第三点', async t => {
    const x = await setup(t); const polygon = x.draw.drawPolygon()
    x.click(a); x.click(b); x.click(c); x.click(a); x.right()
    assert.deepEqual(await polygon, [a, b, c]); x.clean()
    const triangle = x.draw.drawTriangle()
    x.click(a); x.click(b); x.click(Cartesian3.lerp(a, b, 0.5, new Cartesian3()))
    assert.equal(x.draw.isActive, true)
    x.click(c); assert.deepEqual(await triangle, [a, b, c]); x.clean()
})

test('公共几何计算拒绝非有限坐标', () => {
    assert.throws(() => getRectanglePoints(new Cartesian3(NaN, 1, 2), b), /finite/)
    assert.throws(() => getInclinedRectangle(a, b, new Cartesian3(1, Infinity, 2)), /finite/)
})
