import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { Ellipsoid, Math as CesiumMath } from 'cesium'

// Transpile the isolated manager without needing a DOM or WebGL context.
const source = readFileSync(new URL('../src/ts/camera/CameraManager.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const code = js.replace(/from 'cesium'/g, `from '${import.meta.resolve('cesium')}'`)
const { CameraManager } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const view = { longitude: 106, latitude: 29, height: 3000, heading: 20, pitch: -45, roll: 0 }

function fixture() {
    const log = []
    let flight
    let targetResolve
    const camera = {
        positionCartographic: { longitude: 1, latitude: 0.5, height: 8000 },
        heading: 0.2, pitch: -0.8, roll: 0,
        flyTo(options) { flight = options; if (options.duration === 0) options.complete() },
        cancelFlight() { const previous = flight; flight = undefined; previous?.cancel() },
        setView(options) { camera.lastView = options },
        getPickRay(point) { camera.pickPoint = point; return undefined },
        computeViewRectangle() { return undefined }
    }
    const viewer = {
        camera, isDestroyed: () => false,
        scene: { globe: { ellipsoid: Ellipsoid.WGS84 }, canvas: { clientWidth: 800, clientHeight: 600, width: 1600, height: 1200 }, screenSpaceCameraController: { enableTilt: true }, requestRender() {} },
        flyTo(target) {
            if (Array.isArray(target) && target.length === 0) { log.push('clearTarget'); return Promise.resolve(false) }
            return new Promise(resolve => { targetResolve = resolve })
        }
    }
    const events = { raiseFlyStart: () => log.push('start'), raiseFlyEnd: () => log.push('end'), raiseFlyCancel: () => log.push('cancel') }
    const manager = new CameraManager(viewer, events)
    return { manager, viewer, camera, events, log, complete: () => flight.complete(), resolveTarget: value => targetResolve(value) }
}

test('view uses degrees, round trips, center uses CSS pixels and missing intersections are undefined', () => {
    const f = fixture()
    const saved = f.manager.getView()
    assert.equal(saved.longitude, CesiumMath.toDegrees(1))
    f.manager.setView(saved)
    assert.ok(Math.abs(f.camera.lastView.orientation.heading - 0.2) < 1e-12)
    assert.equal(f.manager.getHeight(), 8000)
    assert.equal(f.manager.getCenter(), undefined)
    assert.deepEqual([f.camera.pickPoint.x, f.camera.pickPoint.y], [400, 300])
    assert.equal(f.manager.getExtent(), undefined)
    assert.equal(f.manager.setTopView(), false)
})

test('replacing, cancelling, zero-duration and completing flights settle exactly once', async () => {
    const f = fixture()
    const first = f.manager.flyTo(view)
    const second = f.manager.flyTo(view)
    assert.equal(await first, false)
    f.complete()
    assert.equal(await second, true)
    const third = f.manager.flyTo(view)
    f.manager.cancelFlight()
    assert.equal(await third, false)
    assert.equal(await f.manager.flyTo({ ...view, duration: 0 }), true)
    assert.deepEqual(f.log, ['start', 'cancel', 'start', 'end', 'start', 'cancel', 'start', 'end'])
})

test('setView and destruction settle flights; destruction is idempotent', async () => {
    const f = fixture()
    const first = f.manager.flyTo(view)
    f.manager.setView(view)
    assert.equal(await first, false)
    const second = f.manager.flyTo(view)
    f.manager.destroy()
    assert.equal(await second, false)
    f.manager.destroy()
    assert.throws(() => f.manager.getView(), /destroyed/)
})

test('start listener can cancel synchronously before Cesium starts', async () => {
    const f = fixture()
    f.events.raiseFlyStart = () => f.manager.cancelFlight()
    assert.equal(await f.manager.flyTo(view), false)
})

test('a cancellation listener starting a newer flight supersedes the outer operation', async () => {
    const f = fixture()
    const first = f.manager.flyTo(view)
    let newest
    f.events.raiseFlyCancel = () => { f.events.raiseFlyCancel = () => {}; newest = f.manager.flyTo(view) }
    const outer = f.manager.flyTo(view)
    assert.equal(await first, false)
    assert.equal(await outer, false)
    f.complete()
    assert.equal(await newest, true)
})

test('waiting target is invalidated when a geographic flight replaces it', async () => {
    const f = fixture()
    const target = f.manager.flyToTarget({})
    const next = f.manager.flyTo(view)
    assert.equal(await target, false)
    assert.ok(f.log.includes('clearTarget'))
    f.resolveTarget(true)
    await Promise.resolve()
    f.complete()
    assert.equal(await next, true)
    assert.equal(f.log.filter(item => item === 'end').length, 1)
})

test('invalid parameters do not cancel an existing valid flight', async () => {
    const f = fixture()
    const pending = f.manager.flyTo(view)
    assert.throws(() => f.manager.flyTo({ ...view, latitude: 91 }), RangeError)
    assert.throws(() => f.manager.flyTo({ ...view, duration: -1 }), RangeError)
    assert.throws(() => f.manager.flyToExtent({ west: 0, east: 1, south: 5, north: 2 }), RangeError)
    f.complete()
    assert.equal(await pending, true)
})

test('tilt lock restores original disabled setting', () => {
    const f = fixture()
    f.viewer.scene.screenSpaceCameraController.enableTilt = false
    f.camera.getPickRay = () => ({})
    f.viewer.scene.globe.pick = () => Ellipsoid.WGS84.cartographicToCartesian({ longitude: 1, latitude: 0.5, height: 100 })
    assert.equal(f.manager.lockTopView(), true)
    assert.equal(f.camera.lastView.orientation.pitch, -Math.PI / 2)
    f.manager.lockTopView(false)
    assert.equal(f.viewer.scene.screenSpaceCameraController.enableTilt, false)
})
