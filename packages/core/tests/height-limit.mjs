// Build the SDK before running this test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Cartesian3, Cartographic, Color, PolygonGeometry, PolygonHierarchy, PrimitiveCollection } from 'cesium';
import { HeightLimitAnalysis } from '../dist/index.js';

const positions = [
    { longitude: 110, latitude: 30, height: 0 },
    { longitude: 110.001, latitude: 30, height: 0 },
    { longitude: 110.001, latitude: 30.001, height: 0 },
    { longitude: 110, latitude: 30.001, height: 0 },
];

function fixture() {
    const callbacks = new Set();
    const viewer = {
        isDestroyed: () => false,
        scene: {
            primitives: new PrimitiveCollection(),
            requestRender() {},
            invertClassification: true,
            invertClassificationColor: Color.BLUE,
        },
    };
    const host = { viewer, onBeforeDestroy(callback) { callbacks.add(callback); return () => callbacks.delete(callback); } };
    return { viewer, host, callbacks };
}

test('height, range and color updates retain one primitive and preserve scene state', () => {
    const { viewer, host } = fixture();
    const analysis = new HeightLimitAnalysis(host, { hierarchy: positions, height: 40, show: false });
    const first = viewer.scene.primitives.get(0);
    assert(!analysis.show);
    analysis.height = 50;
    assert(first.isDestroyed());
    assert(!analysis.show);
    analysis.update({ color: Color.YELLOW, hierarchy: positions.slice().reverse(), show: true });
    assert.equal(analysis.height, 50);
    assert.equal(viewer.scene.primitives.length, 1);
    assert(analysis.show && Color.equals(analysis.color, Color.YELLOW));
    assert.equal(viewer.scene.invertClassification, true);
    assert.equal(viewer.scene.invertClassificationColor, Color.BLUE);
    const current = viewer.scene.primitives.get(0);
    analysis.height = 50;
    assert.equal(viewer.scene.primitives.get(0), current);
    analysis.destroy();
});

test('invalid updates preserve the existing primitive and settings', () => {
    const { viewer, host } = fixture();
    const analysis = new HeightLimitAnalysis(host, { hierarchy: positions, height: 40, upperHeight: 100 });
    const primitive = viewer.scene.primitives.get(0);
    for (const options of [
        { height: NaN }, { height: 100 }, { upperHeight: 39 }, { hierarchy: positions.slice(0, 2) },
        { hierarchy: [positions[0], positions[0], positions[0]] },
        { color: new Color(Infinity, 0, 0, 1) },
    ]) {
        assert.throws(() => analysis.update(options), RangeError);
        assert.equal(viewer.scene.primitives.get(0), primitive);
        assert.equal(analysis.height, 40);
        assert.equal(analysis.upperHeight, 100);
    }
    for (const value of [undefined, null, NaN, Infinity]) assert.throws(() => { analysis.height = value; }, RangeError);
    analysis.destroy();
});

test('caller-owned hierarchy, holes and color are copied before later updates', () => {
    const { viewer, host } = fixture();
    const outer = positions.map(point => Cartesian3.fromDegrees(point.longitude, point.latitude));
    const hole = [
        [110.0002, 30.0002], [110.0004, 30.0002], [110.0004, 30.0004], [110.0002, 30.0004],
    ].map(([longitude, latitude]) => Cartesian3.fromDegrees(longitude, latitude));
    const color = Color.RED.clone();
    const analysis = new HeightLimitAnalysis(host, {
        hierarchy: new PolygonHierarchy([...outer, outer[0]], [new PolygonHierarchy(hole)]), height: 40, color,
    });
    outer[0].x = 0;
    hole[0].x = 0;
    color.red = 0;
    analysis.height = 50;
    assert.equal(analysis.color.red, 1);
    const returnedColor = analysis.color;
    returnedColor.red = 0;
    assert.equal(analysis.color.red, 1);
    const mesh = PolygonGeometry.createGeometry(viewer.scene.primitives.get(0).geometryInstances.geometry);
    const vertices = mesh.attributes.position.values;
    for (let index = 0; index < vertices.length; index += 3) {
        const point = Cartographic.fromCartesian(new Cartesian3(vertices[index], vertices[index + 1], vertices[index + 2]));
        assert(Math.abs(point.longitude * 180 / Math.PI - 110.0005) < 0.002);
    }
    analysis.destroy();
});

test('failed primitive replacement preserves the previous analysis', () => {
    const { viewer, host } = fixture();
    const analysis = new HeightLimitAnalysis(host, { hierarchy: positions, height: 40 });
    const primitive = viewer.scene.primitives.get(0);
    const add = viewer.scene.primitives.add;
    viewer.scene.primitives.add = () => { throw new Error('add failed'); };
    assert.throws(() => analysis.update({ height: 60 }), /add failed/);
    assert.equal(analysis.height, 40);
    assert.equal(viewer.scene.primitives.get(0), primitive);
    viewer.scene.primitives.add = add;
    analysis.destroy();
});

test('earth destruction cleans the primitive and unregisters lifecycle hooks', () => {
    const { viewer, host, callbacks } = fixture();
    const analysis = new HeightLimitAnalysis(host, { hierarchy: positions, height: 40 });
    for (const callback of [...callbacks]) callback();
    assert(analysis.isDestroyed());
    assert.equal(viewer.scene.primitives.length, 0);
    assert.equal(callbacks.size, 0);
    analysis.destroy();
    assert.throws(() => analysis.update({ height: 60 }), /destroyed/);
});
