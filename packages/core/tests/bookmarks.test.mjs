import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Cartesian3, Ellipsoid, Event } from 'cesium'
import { loadTS } from './load-ts.mjs'

const { BookmarkManager } = await import(loadTS(new URL('../src/ts/camera/bookmark/BookmarkManager.ts', import.meta.url)))
const { readFile, saveShareContent } = await import(loadTS(new URL('../src/ts/utils/browser/files.ts', import.meta.url)))
const view = { longitude: 106.55, latitude: 29.56, height: 3000, heading: 0, pitch: -45, roll: 0 }

function fixture() {
    const postRender = new Event()
    const canvas = {
        ownerDocument: { createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,YQ==' }) }
    }
    const viewer = { isDestroyed: () => false, scene: { canvas, postRender, requestRender() {}, globe: { ellipsoid: Ellipsoid.WGS84 } } }
    const camera = { getView: () => ({ ...view }), flyTo: async options => { camera.lastFlight = options; return true } }
    return { viewer, camera, bookmarks: new BookmarkManager(viewer, camera) }
}

test('creation stores snapshots, returns copies, locates through camera and supports removal', async () => {
    const { bookmarks, camera } = fixture()
    const item = await bookmarks.create(' 重庆 ', { thumbnail: false })
    assert.equal(item.name, '重庆')
    item.view.height = 1
    assert.equal(bookmarks.get(item.id).view.height, 3000)
    assert.equal(await bookmarks.flyTo(item.id, 0), true)
    assert.equal(camera.lastFlight.duration, 0)
    assert.equal(await bookmarks.flyTo('missing'), false)
    assert.equal(bookmarks.remove(item.id), true)
    assert.equal(bookmarks.getAll().length, 0)
})

test('JSON round trip, invalid data and duplicate IDs are atomic', async () => {
    const { bookmarks } = fixture()
    await bookmarks.create('original', { thumbnail: false })
    const json = bookmarks.toJSON()
    bookmarks.importJSON('\uFEFF' + json)
    assert.equal(bookmarks.toJSON(), json)
    assert.throws(() => bookmarks.importJSON(json, false), /Duplicate/)
    const bad = JSON.parse(json)
    bad.bookmarks.push({ id: 'bad', name: 'bad', view: { ...view, latitude: 100 } })
    assert.throws(() => bookmarks.importJSON(JSON.stringify(bad)), /view/)
    assert.equal(bookmarks.toJSON(), json)
    assert.throws(() => bookmarks.importJSON('{"version":2,"bookmarks":[]}'), /version/)
})

test('VGE legacy Cartesian/radian bookmark import converts to degrees', () => {
    const { bookmarks } = fixture()
    const entries = bookmarks.importJSON(JSON.stringify([{
        id: 'legacy', name: 'VGE', img: 'data:image/jpeg;base64,YQ==',
        cameraView: { destination: Cartesian3.fromDegrees(106.55, 29.56, 3000), orientation: { heading: 0, pitch: -Math.PI / 4, roll: 0 } }
    }]))
    assert.ok(Math.abs(entries[0].view.longitude - 106.55) < 1e-8)
    assert.ok(Math.abs(entries[0].view.height - 3000) < 1e-5)
    assert.equal(entries[0].view.pitch, -45)
})

test('thumbnail capture waits for render, removes listeners, and propagates canvas errors', async () => {
    const { bookmarks, viewer } = fixture()
    const pending = bookmarks.create('frame')
    assert.equal(viewer.scene.postRender.numberOfListeners, 1)
    viewer.scene.postRender.raiseEvent()
    assert.equal((await pending).image, 'data:image/jpeg;base64,YQ==')
    assert.equal(viewer.scene.postRender.numberOfListeners, 0)
    viewer.scene.canvas.ownerDocument.createElement = () => { throw new Error('tainted') }
    const failure = bookmarks.create('bad')
    viewer.scene.postRender.raiseEvent()
    await assert.rejects(failure, /tainted/)
    assert.equal(bookmarks.getAll().length, 1)
    assert.equal(viewer.scene.postRender.numberOfListeners, 0)
})

test('destroy cancels pending capture and file reads without late mutation', async () => {
    const { bookmarks, viewer } = fixture()
    const capture = bookmarks.create('pending')
    let resolveText
    const file = { name: 'views.json', type: 'application/json', text: () => new Promise(resolve => { resolveText = resolve }) }
    const load = bookmarks.load(file)
    bookmarks.destroy()
    await assert.rejects(capture, /destroyed/)
    await assert.rejects(load, /abort/i)
    resolveText('{"version":1,"bookmarks":[]}')
    assert.equal(viewer.scene.postRender.numberOfListeners, 0)
    bookmarks.destroy()
    assert.throws(() => bookmarks.getAll(), /destroyed/)
})

test('readFile reads supplied text files and propagates read errors and aborts', async () => {
    assert.deepEqual(await readFile({ file: new File(['你好'], 'a.json', { type: 'application/json' }) }), {
        fileName: 'a.json', fileType: 'application/json', fileData: '你好'
    })
    await assert.rejects(readFile({ file: { text: async () => { throw new Error('read failed') } } }), /read failed/)
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(readFile({ signal: controller.signal }), /abort/i)
})

test('picker cancellation removes input and focus listener', async () => {
    const oldDocument = globalThis.document
    const oldWindow = globalThis.window
    let input
    let removed = false
    let unbound = false
    globalThis.document = {
        body: { appendChild() {} },
        createElement() { return input = { addEventListener(type, listener) { this[type] = listener }, remove() { removed = true }, click() {} } }
    }
    globalThis.window = { addEventListener() {}, removeEventListener() { unbound = true } }
    try {
        const pending = readFile()
        input.cancel()
        assert.equal(await pending, undefined)
        assert.equal(removed, true)
        assert.equal(unbound, true)
    } finally {
        globalThis.document = oldDocument
        globalThis.window = oldWindow
    }
})

test('download removes its link and revokes the object URL', async () => {
    const oldDocument = globalThis.document
    const oldCreate = URL.createObjectURL
    const oldRevoke = URL.revokeObjectURL
    let clicked = false
    let removed = false
    let revoked
    let blob
    globalThis.document = { body: { appendChild() {} }, createElement: () => ({ click() { clicked = true }, remove() { removed = true } }) }
    URL.createObjectURL = value => { blob = value; return 'blob:test' }
    URL.revokeObjectURL = value => { revoked = value }
    try {
        saveShareContent('{}', 'bookmarks.json', 'application/json')
        assert.equal(clicked, true)
        assert.equal(removed, true)
        assert.equal(blob.type, 'application/json')
        await new Promise(resolve => setTimeout(resolve, 1100))
        assert.equal(revoked, 'blob:test')
    } finally {
        globalThis.document = oldDocument
        URL.createObjectURL = oldCreate
        URL.revokeObjectURL = oldRevoke
    }
})
