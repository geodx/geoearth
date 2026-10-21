import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import {
    ArcType, Cartesian3, Cartographic, DataSourceCollection, Ellipsoid,
    EllipsoidTerrainProvider, GeographicTilingScheme, JulianDate, ScreenSpaceEventType,
} from 'cesium'

// 同一 bundle 保留 DrawCancelledError 的类身份；只替代输入、GPU 拾取和地形数据。
const entry = '\0measure-test-entry'
const modules = ['tools/draw/index.ts', 'tools/measure/index.ts', 'utils/geometry/index.ts']
const bundle = await build({ configFile: false, logLevel: 'silent', plugins: [{
    name: 'measure-test-entry', enforce: 'pre', resolveId(id) { if (id.endsWith('measure-test-entry')) return entry },
    load(id) { if (id === entry) return modules.map(path => `export * from ${JSON.stringify(fileURLToPath(new URL('../src/ts/' + path, import.meta.url)).replaceAll('\\', '/'))}`).join('\n') },
}], build: { write: false, minify: false, lib: { entry: 'measure-test-entry', formats: ['es'] }, rolldownOptions: { external: ['cesium'] } } })
const outputs = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(result => result.output)
const code = outputs.find(item => item.type === 'chunk' && item.isEntry).code
    .replace(/from (["'])cesium\1/g, `from ${JSON.stringify(import.meta.resolve('cesium'))}`)
const { DrawTool, MeasureTool, MeasureCancelledError, ElevationTarget, ElevationSource, getSurfaceArea, getSurfaceDistance, getSpaceAngle } =
    await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const point = (lon, lat, height = 0) => Cartesian3.fromDegrees(lon, lat, height)
const origin = point(0, 0)

async function setup(t) {
    const listeners = new Map()
    const screen = { addEventListener(type, callback) {
        if (!listeners.has(type)) listeners.set(type, new Set())
        listeners.get(type).add(callback)
        return () => listeners.get(type).delete(callback)
    } }
    const scene = {
        canvas: { style: { cursor: 'grab' } },
        globe: { ellipsoid: Ellipsoid.WGS84, pick: () => undefined, getHeight: () => undefined },
        pickPositionSupported: true, pickPosition: pixel => pixel.world, pick: () => undefined,
        screenSpaceCameraController: { enableInputs: true }, requestRender() {},
    }
    const viewer = { scene, dataSources: new DataSourceCollection(), terrainProvider: new EllipsoidTerrainProvider(),
        isDestroyed: () => false, camera: { getPickRay: () => ({}), pickEllipsoid: () => undefined }, clock: { currentTime: JulianDate.now() } }
    const draw = new DrawTool(viewer, screen)
    const measure = new MeasureTool(viewer, draw)
    await Promise.resolve()
    const source = viewer.dataSources.get(1)
    const emit = (type, payload) => { for (const listener of [...(listeners.get(type) ?? [])]) listener(payload) }
    const click = world => emit(ScreenSpaceEventType.LEFT_CLICK, { position: { world } })
    const right = () => emit(ScreenSpaceEventType.RIGHT_CLICK, {})
    t.after(() => { measure.destroy(); draw.destroy() })
    return { viewer, scene, draw, measure, source, click, right }
}

test('空间距离为三维直线段之和；完成后保留正确线型和标注，支持按 ID 删除', async t => {
    const x = await setup(t)
    const task = x.measure.spaceDistance()
    x.click(origin); x.click(new Cartesian3(origin.x, 3, 4)); x.click(new Cartesian3(origin.x, 6, 4)); x.right()
    const result = await task
    assert.equal(result.distance, 8)
    assert.deepEqual(result.segmentLengths, [5, 3])
    const line = x.source.entities.values.find(entity => entity.polyline).polyline
    assert.equal(line.clampToGround.getValue(), false)
    assert.equal(line.arcType.getValue(), ArcType.NONE)
    assert.equal(x.source.entities.values.find(entity => entity.label).label.text.getValue(), '8.00 m')
    assert.equal(x.measure.getResults()[0], result)
    assert.equal(x.measure.remove(result.id), true)
    assert.equal(x.source.entities.values.length, 0)
    assert.equal(x.measure.remove(result.id), false)
})

test('showResult=false 仍返回和记录结果，不添加实体', async t => {
    const x = await setup(t)
    const task = x.measure.spaceDistance({ showResult: false })
    x.click(origin); x.click(point(0.01, 0)); x.measure.finish()
    assert.ok((await task).distance > 1000)
    assert.equal(x.measure.getResults().length, 1)
    assert.equal(x.source.entities.values.length, 0)
    x.measure.clear(); assert.deepEqual(x.measure.getResults(), [])
})

test('面积接受三个顶点；计算球面面积及闭合周长，不修改节点数组', async t => {
    const x = await setup(t)
    const points = [point(0, 0), point(1, 0), point(0, 1)]
    const task = x.measure.surfaceArea()
    points.forEach(x.click); x.measure.finish()
    const result = await task
    assert.equal(result.positions.length, 3)
    assert.ok(Math.abs(result.area - 6.182e9) / result.area < 0.001)
    assert.ok(result.perimeter > 370000 && result.perimeter < 390000)
    assert.ok(x.source.entities.values.some(entity => entity.polygon))
    const perimeter = x.measure.perimeter({ showResult: false })
    points.forEach(x.click); x.right()
    assert.equal((await perimeter).perimeter, result.perimeter)
})

test('跨日期变更线面积采用短经度区间，顺逆时针一致', () => {
    const cross = [point(179, 0), point(-179, 0), point(-179, 1), point(179, 1)]
    const normal = [point(0, 0), point(2, 0), point(2, 1), point(0, 1)]
    assert.ok(Math.abs(getSurfaceArea(cross) / getSurfaceArea(normal) - 1) < 1e-10)
    assert.ok(Math.abs(getSurfaceArea([...cross].reverse()) / getSurfaceArea(cross) - 1) < 1e-10)
    assert.equal(getSurfaceDistance([point(0, 0, 10), point(0, 0, 500)]), 0)
})

test('高差保留负号，展示竖直线而非贴地线', async t => {
    const x = await setup(t)
    const task = x.measure.verticalDistance()
    x.click(point(110, 30, 100)); x.click(point(111, 31, 50))
    const result = await task
    assert.ok(Math.abs(result.heightDifference + 50) < 1e-6)
    assert.ok(Math.abs(result.distance - 50) < 1e-6)
    assert.equal(x.source.entities.values.find(entity => entity.polyline).polyline.clampToGround.getValue(), false)
})

test('角度的第二点为顶点；连续重复点击忽略，零长度边的计算明确拒绝', async t => {
    const x = await setup(t)
    const first = new Cartesian3(origin.x, 10, 0), last = new Cartesian3(origin.x + 10, 0, 0)
    const task = x.measure.measureAngle()
    x.click(first); x.click(origin); x.click(last)
    assert.ok(Math.abs((await task).angle - 90) < 1e-10)
    x.measure.clear()
    const next = x.measure.measureAngle({ showResult: false })
    x.click(first); x.click(first); x.click(origin); x.click(last)
    assert.equal((await next).angle, 90)
    assert.throws(() => getSpaceAngle([origin, origin, last]), /零长度/)
    assert.equal(x.measure.isActive, false)
    assert.equal(x.source.entities.values.length, 0)
})

test('三角量距在起点切平面分解，满足勾股关系', async t => {
    const x = await setup(t)
    const task = x.measure.triangleDistance()
    x.click(origin); x.click(new Cartesian3(origin.x + 4, 3, 0))
    const result = await task
    assert.equal(result.distance, 5)
    assert.equal(result.horizontalDistance, 3)
    assert.equal(result.verticalDistance, 4)
    assert.ok(Cartesian3.equals(result.corner, new Cartesian3(origin.x, 3, 0)))
})

test('贴地距离加密采样地形，考虑中途起伏且受采样点上限约束', async t => {
    const x = await setup(t)
    x.viewer.terrainProvider = {}
    x.scene.globe.getHeight = position => 100 * Math.sin(position.longitude / (0.002 * Math.PI / 180) * Math.PI)
    const task = x.measure.groundDistance({ sampleSpacing: 10, maxSamples: 9 })
    x.click(point(0, 0)); x.click(point(0.002, 0)); x.right()
    const result = await task
    assert.ok(result.sampledPositions.length > 2 && result.sampledPositions.length <= 9)
    assert.ok(result.distance > 280)
    assert.deepEqual(result.sources, [ElevationSource.TERRAIN])
    assert.ok(result.sampledPositions.some(position => Cartographic.fromCartesian(position).height > 90))
})

test('未配置地形时明确返回椭球来源，不冒充真实地形', async t => {
    const x = await setup(t)
    x.scene.globe.getHeight = () => 0
    const task = x.measure.groundDistance()
    x.click(origin); x.click(point(0.001, 0)); x.right()
    const result = await task
    assert.deepEqual(result.sources, [ElevationSource.ELLIPSOID])
    assert.ok(Math.abs(result.distance - 111.31949) < 0.001)
})

test('地形最高精度采样使用 provider，失败时回退至已加载地形', async t => {
    const x = await setup(t)
    let fail = false, requests = 0
    x.viewer.terrainProvider = {
        availability: { computeMaximumLevelAtPosition: () => 1 }, tilingScheme: new GeographicTilingScheme(),
        requestTileGeometry: async () => { requests++; if (fail) throw Error('tile unavailable'); return { interpolateHeight: () => 123 } },
    }
    const first = x.measure.measureHeight({ target: ElevationTarget.TERRAIN })
    x.click(origin)
    const elevation = await first
    assert.equal(elevation.type, 'point-height')
    assert.equal(elevation.height, 123)
    assert.equal(x.measure.getResults()[0], elevation)
    assert.ok(x.source.entities.values.some(entity => entity.label?.text.getValue() === '123.00 m'))
    assert.ok(requests > 0)
    fail = true; x.scene.globe.getHeight = () => 45
    const second = x.measure.groundDistance()
    x.click(origin); x.click(point(0.001, 0)); x.right()
    const result = await second
    assert.deepEqual(result.sources, [ElevationSource.TERRAIN])
    assert.ok(result.sampledPositions.every(position => Math.abs(Cartographic.fromCartesian(position).height - 45) < 1e-6))
})

test('停止采样立即拒绝 Promise，迟到结果不落图，也不取消随后独立开启的绘制', async t => {
    const x = await setup(t)
    let resolveSample, samplingStarted
    const started = new Promise(resolve => { samplingStarted = resolve })
    x.scene.sampleHeightSupported = true
    x.scene.sampleHeightMostDetailed = positions => { samplingStarted(); return new Promise(resolve => { resolveSample = () => { positions[0].height = 123; resolve(positions) } }) }
    const task = x.measure.measureHeight()
    x.click(origin); await started
    const independentDrawing = x.draw.drawPoint()
    const rejected = assert.rejects(task, MeasureCancelledError)
    assert.equal(x.measure.finish(), false)
    assert.equal(x.measure.stop(), true)
    await rejected
    assert.equal(x.measure.isActive, false)
    assert.equal(x.draw.isActive, true)
    x.click(origin); assert.ok(Cartesian3.equals(await independentDrawing, origin))
    resolveSample(); await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(x.measure.getResults(), [])
    assert.equal(x.source.entities.values.length, 0)
})

test('右键取消统一抛出 MeasureCancelledError，新测量替换旧测量', async t => {
    const x = await setup(t)
    const old = x.measure.spaceDistance(), rejected = assert.rejects(old, MeasureCancelledError)
    const next = x.measure.measureHeight({ target: ElevationTarget.TERRAIN })
    x.click(origin); await rejected
    assert.equal((await next).source, ElevationSource.ELLIPSOID)
    const cancelled = x.measure.spaceDistance(), rightRejected = assert.rejects(cancelled, MeasureCancelledError)
    x.right(); await rightRejected
    assert.equal(x.measure.getResults().length, 1)
})

test('clear 停止采集，destroy 也处理尚未加入集合的数据源且可重复调用', async t => {
    const x = await setup(t)
    const task = x.measure.spaceDistance(), rejected = assert.rejects(task, MeasureCancelledError)
    x.measure.clear(); await rejected
    const second = new MeasureTool(x.viewer, x.draw)
    second.destroy(); second.destroy()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(x.viewer.dataSources.length, 2)
    await assert.rejects(second.measureHeight(), /已销毁/)
})

test('无效采样参数和小数位数在采集前拒绝', async t => {
    const x = await setup(t)
    await assert.rejects(x.measure.groundDistance({ sampleSpacing: 0 }), /sampleSpacing/)
    await assert.rejects(x.measure.groundDistance({ maxSamples: 1 }), /maxSamples/)
    await assert.rejects(x.measure.spaceDistance({ fractionDigits: 101 }), /fractionDigits/)
    assert.equal(x.draw.isActive, false)
})
