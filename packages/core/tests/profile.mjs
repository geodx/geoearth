// Build the SDK before running this test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Cartesian3, Cartographic, CustomHeightmapTerrainProvider, Ellipsoid, EllipsoidTerrainProvider, Math as CesiumMath } from 'cesium';
import { computeProfile } from '../dist/index.js';

function fixture() {
    const callbacks = new Set();
    const viewer = {
        isDestroyed: () => false,
        terrainProvider: new EllipsoidTerrainProvider(),
        scene: { globe: { ellipsoid: Ellipsoid.WGS84 }, clampToHeightSupported: true },
    };
    const host = {
        viewer,
        onBeforeDestroy(callback) {
            callbacks.add(callback);
            return () => callbacks.delete(callback);
        },
    };
    return { viewer, host, callbacks };
}

const path = [
    { longitude: 0, latitude: 0, height: 10 },
    { longitude: 0.01, latitude: 0, height: 100 },
    { longitude: 0.01, latitude: 0.02, height: 0 },
];

test('multi-segment sampling preserves control points, distances, endpoints and caller input', async () => {
    const { host, callbacks } = fixture();
    const before = structuredClone(path);
    const result = await computeProfile(host, path, { sampleSpacing: 75 });
    assert.deepEqual(path, before);
    assert.equal(result.samples[0].distance, 0);
    assert.equal(result.samples.at(-1).distance, result.totalDistance);
    assert(Math.abs(result.samples.at(-1).latitude - 0.02) < 1e-10);
    assert(result.samples.some(point => Math.abs(point.longitude - 0.01) < 1e-10 && Math.abs(point.latitude) < 1e-10));
    for (let i = 1; i < result.samples.length; i++) {
        const interval = result.samples[i].distance - result.samples[i - 1].distance;
        assert(interval > 0 && interval <= 75.000001);
    }
    assert(result.samples.every(point => point.height === 0));
    assert.equal(result.terrainSource, 'ellipsoid');
    assert.equal(callbacks.size, 0);
});

test('sample caps keep all turns, remove consecutive duplicates and accept Cartesian3', async () => {
    const { host } = fixture();
    const capped = await computeProfile(host, [path[0], path[0], ...path.slice(1)], { maxSamples: 3 });
    assert.equal(capped.samples.length, 3);
    const cartesian = path.map(point => Cartesian3.fromDegrees(point.longitude, point.latitude, point.height));
    const second = await computeProfile(host, cartesian, { maxSamples: 7, sampleSpacing: 0.01 });
    assert(second.samples.length <= 7);
    assert(Math.abs(second.totalDistance - capped.totalDistance) < 1e-5);
    await assert.rejects(computeProfile(host, path, { maxSamples: 2 }), /控制点/);
});

test('antimeridian routes take the short path', async () => {
    const { host } = fixture();
    const result = await computeProfile(host, [
        { longitude: 179.99, latitude: 0, height: 0 },
        { longitude: -179.99, latitude: 0, height: 0 },
    ]);
    const expected = Ellipsoid.WGS84.maximumRadius * CesiumMath.toRadians(0.02);
    assert(Math.abs(result.totalDistance - expected) < 0.001);
    assert(result.samples.every(point => Math.abs(point.longitude) > 179.98));
});

test('surface gaps keep their indices and preserve zero and negative heights', async () => {
    const { viewer, host } = fixture();
    const excluded = {};
    viewer.scene.clampToHeightMostDetailed = async (points, exclude) => {
        assert.equal(exclude[0], excluded);
        return points.map((point, index) => {
            if (index === 1) return undefined;
            const geo = Cartographic.fromCartesian(point);
            return Cartesian3.fromRadians(geo.longitude, geo.latitude, index === 0 ? -25 : 80);
        });
    };
    const result = await computeProfile(host, path, { maxSamples: 3, source: 'surface', exclude: [excluded] });
    assert(Math.abs(result.samples[0].height + 25) < 1e-6);
    assert.equal(result.samples[1].height, 0);
    assert(Math.abs(result.samples[2].height - 80) < 1e-6);
    assert.equal(result.lowestPoint, result.samples[0]);
    assert.equal(result.highestPoint, result.samples[2]);
});

test('explicit levels sample custom terrain independently of visible tiles', async () => {
    const { viewer, host } = fixture();
    viewer.terrainProvider = new CustomHeightmapTerrainProvider({
        width: 8, height: 8, callback: () => new Float32Array(64).fill(-42),
    });
    const result = await computeProfile(host, path, { terrainLevel: 8 });
    assert.equal(result.terrainSource, 'terrain');
    assert(result.samples.every(point => Math.abs(point.height + 42) < 1e-5));
});

test('validation and unavailable terrain fail explicitly', async () => {
    const { viewer, host } = fixture();
    for (const options of [
        { sampleSpacing: 0 }, { sampleSpacing: NaN }, { maxSamples: 2.5 },
        { maxSamples: Infinity }, { source: 'invalid' }, { terrainLevel: -1 },
    ]) await assert.rejects(computeProfile(host, path, options), RangeError);
    await assert.rejects(computeProfile(host, []), RangeError);
    await assert.rejects(computeProfile(host, [path[0], path[0]]), RangeError);
    await assert.rejects(computeProfile(host, [Cartesian3.ZERO, path[1]]), RangeError);
    viewer.terrainProvider = {};
    viewer.scene.globe.getHeight = () => undefined;
    await assert.rejects(computeProfile(host, path), /高度不可用/);
});

test('abort and earth destruction settle pending work and remove listeners', async () => {
    for (const cancelEarth of [false, true]) {
        const { viewer, host, callbacks } = fixture();
        let finish;
        viewer.scene.clampToHeightMostDetailed = () => new Promise(resolve => { finish = resolve; });
        const controller = new AbortController();
        const pending = computeProfile(host, path, { source: 'surface', signal: controller.signal });
        if (cancelEarth) for (const callback of [...callbacks]) callback();
        else controller.abort();
        await assert.rejects(pending, { name: 'AbortError' });
        assert.equal(callbacks.size, 0);
        finish([]);
    }
    const { host } = fixture();
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(computeProfile(host, path, { signal: controller.signal }), { name: 'AbortError' });
});

test('terrain changes and sampling failures never publish mixed results', async () => {
    const { viewer, host, callbacks } = fixture();
    viewer.scene.clampToHeightMostDetailed = async () => {
        viewer.terrainProvider = new EllipsoidTerrainProvider();
        return [];
    };
    await assert.rejects(computeProfile(host, path, { source: 'surface' }), /地形已切换/);
    viewer.scene.clampToHeightMostDetailed = async () => { throw new Error('sample failed'); };
    await assert.rejects(computeProfile(host, path, { source: 'surface' }), /sample failed/);
    assert.equal(callbacks.size, 0);
});
