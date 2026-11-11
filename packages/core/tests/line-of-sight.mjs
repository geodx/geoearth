// Build the SDK before running this test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Cartesian3, Cartographic, CustomHeightmapTerrainProvider, Ellipsoid, EllipsoidTerrainProvider, Event, Math as CesiumMath, SceneMode } from 'cesium';
import { computeLineOfSight } from '../dist/index.js';

function fixture() {
    const callbacks = new Set();
    const postRender = new Event();
    const viewer = {
        isDestroyed: () => false,
        terrainProvider: new EllipsoidTerrainProvider(),
        dataSourceDisplay: { ready: true },
        scene: {
            globe: { ellipsoid: Ellipsoid.WGS84 }, mode: SceneMode.SCENE3D, pickPositionSupported: true,
            pickFromRayMostDetailed: async () => undefined,
            postRender, renderError: new Event(), requestRender: () => queueMicrotask(() => postRender.raiseEvent()),
        },
    };
    const host = { viewer, onBeforeDestroy(callback) { callbacks.add(callback); return () => callbacks.delete(callback); } };
    return { viewer, host, callbacks };
}

const point = (longitude, height) => ({ longitude, latitude: 0, height });

test('clear endpoints preserve caller data and apply independent height offsets', async () => {
    const { host, callbacks } = fixture();
    const observer = point(0, 50), target = point(0.001, 60);
    const result = await computeLineOfSight(host, observer, target, { observerHeight: 2, targetHeight: 3 });
    assert(result.visible);
    assert(Math.abs(Cartographic.fromCartesian(result.observer).height - 52) < 1e-5);
    assert(Math.abs(Cartographic.fromCartesian(result.target).height - 63) < 1e-5);
    assert.equal(observer.height, 50);
    assert.equal(target.height, 60);
    assert.equal(result.terrainSource, 'ellipsoid');
    assert.equal(callbacks.size, 0);
});

test('earth curvature obstructs a long chord even when both endpoints are above ground', async () => {
    const { host } = fixture();
    const blocked = await computeLineOfSight(host, point(0, 2), point(0.1, 2), { source: 'terrain' });
    assert(!blocked.visible);
    assert.equal(blocked.obstruction.source, 'terrain');
    assert(blocked.obstruction.distance > 1000 && blocked.obstruction.distance < blocked.distance / 2);
    const clear = await computeLineOfSight(host, point(0, 100), point(0.1, 100), { source: 'terrain' });
    assert(clear.visible);
});

test('vertical and short near-surface lines respect the ground tolerance', async () => {
    const { host } = fixture();
    assert((await computeLineOfSight(host, point(0, 10), point(0, 100), { source: 'terrain' })).visible);
    assert((await computeLineOfSight(host, point(0, 0), point(0.0001, 0), { source: 'terrain' })).visible);
    const buried = await computeLineOfSight(host, point(0, -10), point(0.001, 100), { source: 'terrain' });
    assert(!buried.visible);
    assert.equal(buried.obstruction.distance, 0);
});

test('sampled terrain finds and refines the first ridge while honoring the sample cap', async () => {
    const { viewer, host } = fixture();
    viewer.terrainProvider = new CustomHeightmapTerrainProvider({
        width: 32, height: 32,
        callback(x, y, level) {
            const rectangle = this.tilingScheme.tileXYToRectangle(x, y, level);
            return Float32Array.from({ length: 1024 }, (_, index) => {
                const longitude = CesiumMath.lerp(rectangle.west, rectangle.east, (index % 32) / 31);
                const east = longitude * Ellipsoid.WGS84.maximumRadius;
                return 500 * Math.exp(-((east / 100) ** 2));
            });
        },
    });
    // CustomHeightmapTerrainProvider calls its callback as an instance method.
    const result = await computeLineOfSight(host, point(-0.005, 100), point(0.005, 100), {
        source: 'terrain', sampleSpacing: 1, maxSamples: 100, terrainLevel: 16,
    });
    assert(!result.visible);
    assert.equal(result.obstruction.source, 'terrain');
    assert(result.obstruction.distance > 400 && result.obstruction.distance < 470);
    assert(result.sampleSpacing >= result.distance / 99 - 1e-8);
});

test('negative terrain heights are not replaced by an ellipsoid obstruction', async () => {
    const { viewer, host } = fixture();
    viewer.terrainProvider = new CustomHeightmapTerrainProvider({
        width: 8, height: 8, callback: () => new Float32Array(64).fill(-50),
    });
    assert((await computeLineOfSight(host, point(0, -25), point(0.001, -25), { source: 'terrain', terrainLevel: 8 })).visible);
});

test('scene ray returns only intersections within the finite segment and forwards exclusions', async () => {
    const { viewer, host } = fixture();
    const observer = Cartesian3.fromDegrees(0, 0, 100), target = Cartesian3.fromDegrees(0.001, 0, 100);
    const object = {}, excluded = {};
    viewer.scene.pickFromRayMostDetailed = async (_ray, exclusions) => {
        assert.equal(exclusions[0], excluded);
        return { position: Cartesian3.lerp(observer, target, 0.4, new Cartesian3()), object };
    };
    const hit = await computeLineOfSight(host, observer, target, { exclude: [excluded] });
    assert(!hit.visible);
    assert.equal(hit.obstruction.source, 'scene');
    assert.equal(hit.obstruction.object, object);
    assert(Math.abs(hit.obstruction.distance - hit.distance * 0.4) < 1e-5);
    for (const fraction of [0, 1, 1.5]) {
        viewer.scene.pickFromRayMostDetailed = async () => ({ position: Cartesian3.lerp(observer, target, fraction, new Cartesian3()), object });
        assert((await computeLineOfSight(host, observer, target)).visible);
    }
    viewer.scene.pickFromRayMostDetailed = async () => ({ position: Cartesian3.lerp(observer, target, 0.4, new Cartesian3()) });
    assert((await computeLineOfSight(host, observer, target)).visible);
});

test('the nearest terrain obstruction wins over a later scene hit', async () => {
    const { viewer, host } = fixture();
    const observer = Cartesian3.fromDegrees(0, 0, 2), target = Cartesian3.fromDegrees(0.1, 0, 2);
    viewer.scene.pickFromRayMostDetailed = async () => ({ position: Cartesian3.lerp(observer, target, 0.8, new Cartesian3()), object: {} });
    const result = await computeLineOfSight(host, observer, target);
    assert.equal(result.obstruction.source, 'terrain');
    assert(result.obstruction.distance < result.distance / 2);
});

test('unsupported scene mode is explicit and terrain-only queries still work', async () => {
    const { viewer, host } = fixture();
    viewer.scene.pickPositionSupported = false;
    await assert.rejects(computeLineOfSight(host, point(0, 100), point(0.001, 100)), /不支持/);
    assert((await computeLineOfSight(host, point(0, 100), point(0.001, 100), { source: 'terrain' })).visible);
});

test('scene checks wait for Entity geometry and release frame listeners when cancelled', async () => {
    const { viewer, host } = fixture();
    viewer.dataSourceDisplay.ready = false;
    viewer.scene.requestRender = () => {};
    let rayCalls = 0;
    viewer.scene.pickFromRayMostDetailed = async () => { rayCalls++; };
    const controller = new AbortController();
    const pending = computeLineOfSight(host, point(0, 100), point(0.001, 100), { signal: controller.signal });
    viewer.scene.postRender.raiseEvent();
    assert.equal(rayCalls, 0);
    viewer.dataSourceDisplay.ready = true;
    viewer.scene.postRender.raiseEvent();
    await pending;
    assert.equal(rayCalls, 1);
    assert.equal(viewer.scene.postRender.numberOfListeners, 0);
    const cancelled = computeLineOfSight(host, point(0, 100), point(0.001, 100), { signal: controller.signal });
    controller.abort();
    await assert.rejects(cancelled, { name: 'AbortError' });
    assert.equal(viewer.scene.postRender.numberOfListeners, 0);
    assert.equal(viewer.scene.renderError.numberOfListeners, 0);
});

test('invalid endpoints and options reject before returning a result', async () => {
    const { host } = fixture();
    for (const options of [
        { source: 'invalid' }, { sampleSpacing: 0 }, { sampleSpacing: Infinity },
        { maxSamples: 2 }, { maxSamples: 3.5 }, { tolerance: 0 },
        { observerHeight: NaN }, { targetHeight: Infinity }, { terrainLevel: 31 },
    ]) await assert.rejects(computeLineOfSight(host, point(0, 100), point(0.001, 100), options), RangeError);
    await assert.rejects(computeLineOfSight(host, point(0, 0), point(0, 0)), RangeError);
    await assert.rejects(computeLineOfSight(host, Cartesian3.ZERO, point(0, 100)), RangeError);
});

test('cancellation and earth destruction reject pending rays and release lifecycle listeners', async () => {
    for (const destroy of [false, true]) {
        const { viewer, host, callbacks } = fixture();
        viewer.scene.pickFromRayMostDetailed = () => new Promise(() => {});
        const controller = new AbortController();
        const pending = computeLineOfSight(host, point(0, 100), point(0.001, 100), { signal: controller.signal });
        if (destroy) for (const callback of [...callbacks]) callback();
        else controller.abort();
        await assert.rejects(pending, { name: 'AbortError' });
        assert.equal(callbacks.size, 0);
    }
});

test('terrain changes and sampling failures propagate without publishing a result', async () => {
    const { viewer, host, callbacks } = fixture();
    viewer.scene.pickFromRayMostDetailed = async () => { viewer.terrainProvider = new EllipsoidTerrainProvider(); };
    await assert.rejects(computeLineOfSight(host, point(0, 100), point(0.001, 100)), /地形已切换/);
    viewer.scene.pickFromRayMostDetailed = async () => { throw new Error('ray failed'); };
    await assert.rejects(computeLineOfSight(host, point(0, 100), point(0.001, 100)), /ray failed/);
    assert.equal(callbacks.size, 0);
});
