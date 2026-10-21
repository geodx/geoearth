import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { build } from 'vite'
import {
    DataSourceCollection, ImageryLayerCollection, Rectangle, SingleTileImageryProvider,
} from 'cesium'

// 直接构建当前管理器，使用真实 Cesium 图层、集合和同步移除事件。
// 仅替换图片网络加载与相机飞行；图片解码、渲染和真实飞行由浏览器验证。
const bundle = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
        write: false,
        minify: false,
        lib: {
            entry: fileURLToPath(new URL('../src/ts/sources/ResourceManager.ts', import.meta.url)),
            formats: ['es'],
            fileName: 'imagery-test',
        },
        rolldownOptions: { external: ['cesium'] },
    },
})
const cesiumUrl = import.meta.resolve('cesium')
const outputs = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(result => result.output)
const code = outputs.find(item => item.type === 'chunk' && item.isEntry).code
    .replace(/from (["'])cesium\1/g, `from ${JSON.stringify(cesiumUrl)}`)
const { ResourceManager } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

function source(id = 'single') {
    return {
        id, name: '测试影像', catalog: '测试', sourceType: 'imagery', show: false,
        properties: {
            scheme: 'singleTile', url: '/image.png', alpha: 0,
            rectangle: { west: 100, south: 20, east: 120, north: 40 },
        },
    }
}

function provider() {
    return new SingleTileImageryProvider({
        url: '/image.png', tileWidth: 720, tileHeight: 360,
        rectangle: Rectangle.fromDegrees(100, 20, 120, 40),
    })
}

function setup(t) {
    const events = []
    const flights = []
    const viewer = {
        imageryLayers: new ImageryLayerCollection(),
        dataSources: new DataSourceCollection(),
        isDestroyed: () => false,
        async flyTo(layer, options) { flights.push({ layer, options }); return true },
    }
    const manager = new ResourceManager(viewer, {
        raiseEvent(_type, payload) { events.push(payload) },
    })
    t.mock.method(SingleTileImageryProvider, 'fromUrl', async () => provider())
    t.after(() => manager.destroy())
    return { manager, viewer, events, flights }
}

test('单张影像保留 show:false、alpha:0，并正确转换经纬度范围', async t => {
    const c = setup(t)
    const layer = await c.manager.addData(source())
    assert.equal(layer.show, false)
    assert.equal(layer.alpha, 0)
    assert.equal(c.manager.getInstance('single'), layer)
    const [url, options] = SingleTileImageryProvider.fromUrl.mock.calls[0].arguments
    assert.equal(url.url.endsWith('/image.png'), true)
    assert.ok(Rectangle.equals(options.rectangle, Rectangle.fromDegrees(100, 20, 120, 40)))
    assert.equal(c.events.filter(event => event.type === 'add').length, 1)
})

test('主动删除仅销毁一次、触发一次 REMOVE，并允许同 ID 重新加载', async t => {
    const c = setup(t)
    const first = await c.manager.addData(source())
    assert.equal(c.manager.removeSourceById('single'), true)
    assert.equal(first.isDestroyed(), true)
    assert.equal(c.viewer.imageryLayers.length, 0)
    assert.equal(c.manager.getSourceItemById('single'), undefined)
    assert.equal(c.manager.getInstance('single'), undefined)
    assert.equal(c.events.filter(event => event.type === 'remove').length, 1)
    assert.equal(c.manager.removeSourceById('single'), false)
    const second = await c.manager.addData(source())
    assert.notEqual(first, second)
    assert.equal(c.viewer.imageryLayers.length, 1)
})

test('直接通过 Cesium 集合删除时，同步配置和实例且不重复销毁', async t => {
    const c = setup(t)
    const layer = await c.manager.addData(source())
    assert.equal(c.viewer.imageryLayers.remove(layer), true)
    assert.equal(layer.isDestroyed(), true)
    assert.equal(c.manager.getSourceItemById('single'), undefined)
    assert.equal(c.manager.getInstance('single'), undefined)
    const removed = c.events.filter(event => event.type === 'remove')
    assert.equal(removed.length, 1)
    assert.equal(removed[0].id, 'single')
    assert.equal(removed[0].source.name, '测试影像')
})

test('底图在加入集合后置底，destroy 清空所有图层并解绑监听', async t => {
    const c = setup(t)
    const overlay = await c.manager.addData(source('overlay'))
    const base = source('base')
    base.properties.baseLayer = true
    const baseLayer = await c.manager.addData(base)
    assert.equal(c.viewer.imageryLayers.get(0), baseLayer)
    c.manager.destroy()
    assert.equal(overlay.isDestroyed(), true)
    assert.equal(baseLayer.isDestroyed(), true)
    assert.equal(c.viewer.imageryLayers.length, 0)
    assert.equal(c.manager.getAllSourceItems().length, 0)
    assert.equal(c.viewer.imageryLayers.layerRemoved.numberOfListeners, 0)
})

test('总入口传回定位结果，资源不存在和飞行取消时返回 false', async t => {
    const c = setup(t)
    assert.equal(await c.manager.flyToSourceById('missing'), false)
    const layer = await c.manager.addData(source())
    assert.equal(await c.manager.flyToSourceById('single'), true)
    assert.equal(c.flights[0].layer, layer)
    c.viewer.flyTo = async () => false
    assert.equal(await c.manager.flyToSourceById('single'), false)
})

test('图片加载失败不登记资源，修正后可重试', async t => {
    const c = setup(t)
    t.mock.method(console, 'error', () => {})
    SingleTileImageryProvider.fromUrl.mock.mockImplementationOnce(async () => {
        throw new Error('图片加载失败')
    })
    await assert.rejects(c.manager.addData(source()), /图片加载失败/)
    assert.equal(c.manager.getAllSourceItems().length, 0)
    assert.equal(c.viewer.imageryLayers.length, 0)
    await c.manager.addData(source())
    assert.equal(c.viewer.imageryLayers.length, 1)
})

test('图片加载期间销毁管理器，异步完成后不再添加图层', async t => {
    const c = setup(t)
    t.mock.method(console, 'error', () => {})
    let finish
    SingleTileImageryProvider.fromUrl.mock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const pending = c.manager.addData(source())
    c.manager.destroy()
    finish(provider())
    await assert.rejects(pending, /已销毁/)
    assert.equal(c.viewer.imageryLayers.length, 0)
    assert.equal(c.manager.getAllSourceItems().length, 0)
})
