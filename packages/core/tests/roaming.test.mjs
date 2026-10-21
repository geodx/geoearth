import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Cartesian3, Ellipsoid, EllipsoidTerrainProvider, EntityCollection, Event, Matrix4, SceneMode } from 'cesium'
import { loadTS } from './load-ts.mjs'

const { PathRoaming } = await import(loadTS(new URL('../src/ts/camera/roaming/PathRoaming.ts', import.meta.url)))
const { CameraManager } = await import(loadTS(new URL('../src/ts/camera/CameraManager.ts', import.meta.url)))
const route = [
    { longitude: 106.55, latitude: 29.56, height: 10 },
    { longitude: 106.551, latitude: 29.56, height: 10 },
    { longitude: 106.552, latitude: 29.56, height: 10 },
]

function fixture(t, options = {}) {
    let now = 0
    t.mock.method(performance, 'now', () => now)
    const camera = {
        transform: Matrix4.clone(Matrix4.IDENTITY), positionCartographic: { longitude: 1, latitude: 0.5, height: 100 }, heading: 0, pitch: -0.5, roll: 0,
        lookAt(position, offset) { this.lastOrbit = { position, offset } },
        lookAtTransform(matrix) { this.transform = Matrix4.clone(matrix) },
        setView(view) { this.lastView = view },
        cancelFlight() {}, flyTo(options) { this.flight = options }
    }
    const viewer = {
        camera, trackedEntity: undefined, isDestroyed: () => false, entities: new EntityCollection(),
        clock: { multiplier: 9, shouldAnimate: false }, terrainProvider: new EllipsoidTerrainProvider(),
        scene: {
            mode: SceneMode.SCENE3D, preUpdate: new Event(), globe: { ellipsoid: Ellipsoid.WGS84 },
            screenSpaceCameraController: { enableInputs: true }, requestRender() {}, clampToHeightSupported: false,
        }
    }
    const roaming = new PathRoaming(viewer, options)
    return { viewer, camera, roaming, step(milliseconds) { now += milliseconds; viewer.scene.preUpdate.raiseEvent() } }
}

test('path validates atomically, removes duplicates and stores copies', t => {
    const { roaming } = fixture(t)
    roaming.setPath([route[0], route[0], route[1]])
    assert.equal(roaming.path.length, 2)
    assert.ok(roaming.duration > 0)
    const copy = roaming.path
    copy[0].height = 1000
    assert.ok(roaming.path[0].height < 11)
    assert.throws(() => roaming.setPath([route[0], route[0]]), /non-zero/)
    assert.equal(roaming.path.length, 2)
    assert.throws(() => roaming.start({ speed: 0 }), /positive/)
})

test('pause/resume keeps progress, multiplier scales elapsed movement; clock is untouched', t => {
    const { roaming, viewer, step } = fixture(t)
    roaming.setPath(route)
    roaming.start()
    step(1000)
    const progress = roaming.progress
    assert.ok(progress > 0)
    roaming.pause()
    assert.equal(viewer.scene.screenSpaceCameraController.enableInputs, true)
    step(100000)
    assert.equal(roaming.progress, progress)
    roaming.resume()
    roaming.setMultiplier(2)
    step(1000)
    assert.ok(Math.abs(roaming.progress - progress * 3) < 1e-12)
    assert.deepEqual(viewer.clock, { multiplier: 9, shouldAnimate: false })
    roaming.destroy()
    assert.equal(viewer.entities.values.length, 0)
    assert.equal(viewer.scene.preUpdate.numberOfListeners, 0)
})

test('completion releases camera and loops retain the remainder across several laps', t => {
    const { roaming, viewer, step } = fixture(t)
    roaming.setPath(route)
    roaming.start()
    step(roaming.duration * 1000 + 1)
    assert.equal(roaming.state, 'completed')
    assert.equal(roaming.progress, 1)
    assert.equal(viewer.scene.preUpdate.numberOfListeners, 0)
    assert.equal(viewer.scene.screenSpaceCameraController.enableInputs, true)
    roaming.start({ loop: true })
    step(roaming.duration * 2500)
    assert.ok(Math.abs(roaming.progress - 0.5) < 1e-10)
    roaming.stop()
    assert.equal(roaming.progress, 0)
    assert.equal(roaming.state, 'idle')
})

test('first-person moves camera at eye height; none view does not take camera control', t => {
    const { roaming, viewer, camera, step } = fixture(t)
    viewer.scene.screenSpaceCameraController.enableInputs = false
    roaming.setPath(route)
    roaming.start({ view: 'firstPerson', eyeHeight: 2 })
    const height = Ellipsoid.WGS84.cartesianToCartographic(camera.lastView.destination).height
    assert.ok(Math.abs(height - 12) < 1e-5)
    assert.ok(Number.isFinite(camera.lastView.orientation.heading))
    roaming.setView('none')
    const lastView = camera.lastView
    step(100)
    assert.equal(camera.lastView, lastView)
    roaming.stop()
    assert.equal(viewer.scene.screenSpaceCameraController.enableInputs, false)
})

test('surface sampling preserves missing-hit indices and zero height hits', async t => {
    const { roaming, viewer } = fixture(t)
    viewer.scene.clampToHeightSupported = true
    viewer.scene.clampToHeightMostDetailed = async positions => positions.map((position, i) => {
        if (i === 1) return undefined
        const p = Ellipsoid.WGS84.cartesianToCartographic(position)
        p.height = i === 0 ? 0 : 40
        return Ellipsoid.WGS84.cartographicToCartesian(p)
    })
    assert.equal(await roaming.preparePath(route, { sampleSpacing: 1e6, heightOffset: 2 }), true)
    const heights = roaming.path.map(point => point.height)
    assert.ok(Math.abs(heights[0] - 2) < 1e-5)
    assert.ok(Math.abs(heights[1] - 2) < 1e-5)
    assert.ok(Math.abs(heights[2] - 42) < 1e-5)
})

test('stop invalidates delayed elevation sampling without overwriting a newer path', async t => {
    const { roaming, viewer } = fixture(t)
    let resolve
    viewer.scene.clampToHeightSupported = true
    viewer.scene.clampToHeightMostDetailed = () => new Promise(done => { resolve = done })
    const pending = roaming.preparePath(route, { sampleSpacing: 1e6 })
    roaming.setPath(route.slice(0, 2))
    resolve([])
    assert.equal(await pending, false)
    assert.equal(roaming.path.length, 2)
})

test('ordinary camera operations pause roaming, and manager destruction removes its resources', t => {
    const { viewer, step } = fixture(t)
    const events = { raiseFlyStart() {}, raiseFlyEnd() {}, raiseFlyCancel() {} }
    const camera = new CameraManager(viewer, events)
    camera.roaming.setPath(route)
    camera.roaming.start()
    step(100)
    camera.setView({ longitude: 106, latitude: 29, height: 1000 })
    assert.equal(camera.roaming.state, 'paused')
    assert.equal(viewer.scene.screenSpaceCameraController.enableInputs, true)
    camera.roaming.resume()
    camera.destroy()
    assert.equal(viewer.entities.values.length, 0)
    assert.equal(viewer.scene.preUpdate.numberOfListeners, 0)
})

test('drawing cancellation rejects and releases only the owned draw session', async t => {
    const { roaming } = fixture(t)
    let reject
    const draw = {
        activeChanged: new Event(),
        // DrawTool first ends its previous session before activating the new one.
        drawPolyLine() { this.activeChanged.raiseEvent(false); return new Promise((_, fail) => { reject = fail }) },
        cancel() { this.activeChanged.raiseEvent(false); reject(new Error('draw cancelled')) }
    }
    const pending = roaming.drawPath(draw)
    roaming.stop()
    await assert.rejects(pending, /draw cancelled/)
    assert.equal(draw.activeChanged.numberOfListeners, 0)
})

test('starting an existing route invalidates pending preparation', async t => {
    const { roaming, viewer } = fixture(t)
    roaming.setPath(route.slice(0, 2))
    let resolve
    viewer.scene.clampToHeightSupported = true
    viewer.scene.clampToHeightMostDetailed = () => new Promise(done => { resolve = done })
    const pending = roaming.preparePath(route, { sampleSpacing: 1e6 })
    roaming.start()
    resolve([])
    assert.equal(await pending, false)
    assert.equal(roaming.state, 'playing')
    assert.equal(roaming.path.length, 2)
    roaming.destroy()
})
