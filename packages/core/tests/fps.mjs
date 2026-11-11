// Build the SDK before running this test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Event as CesiumEvent } from 'cesium';
import { FPSMonitor } from '../dist/index.js';

function fixture(t) {
    let now = 0;
    let destroyed = false;
    let renderRequests = 0;
    const visibilityListeners = new Set();
    const document = new EventTarget();
    document.hidden = false;
    const add = document.addEventListener.bind(document);
    const remove = document.removeEventListener.bind(document);
    document.addEventListener = (name, callback, options) => {
        if (name === 'visibilitychange') visibilityListeners.add(callback);
        add(name, callback, options);
    };
    document.removeEventListener = (name, callback, options) => {
        if (name === 'visibilitychange') visibilityListeners.delete(callback);
        remove(name, callback, options);
    };
    const viewer = {
        isDestroyed: () => destroyed,
        container: { ownerDocument: document },
        scene: {
            preRender: new CesiumEvent(),
            postRender: new CesiumEvent(),
            debugShowFramesPerSecond: false,
            requestRender() { renderRequests++; },
        },
    };
    t.mock.method(performance, 'now', () => now);
    const monitor = new FPSMonitor(viewer);
    const frame = (duration = 4, interval = 20) => {
        now += interval - duration;
        viewer.scene.preRender.raiseEvent();
        now += duration;
        viewer.scene.postRender.raiseEvent();
    };
    return {
        viewer, monitor, document, frame, visibilityListeners,
        advance: elapsed => { now += elapsed; },
        requests: () => renderRequests,
        destroyViewer: () => { destroyed = true; },
    };
}

test('statistics start lazily and count actual frames with measured CPU duration', t => {
    const { viewer, monitor, frame, requests } = fixture(t);
    assert.equal(viewer.scene.postRender.numberOfListeners, 0);
    assert.equal(monitor.getStats().state, 'sampling');
    for (let index = 0; index < 50; index++) frame();
    const stats = monitor.getStats();
    assert.equal(stats.fps, 50);
    assert.equal(stats.renderTime, 4);
    assert.equal(stats.frames, 50);
    assert.equal(stats.sampleDuration, 1000);
    assert.equal(stats.state, 'rendering');
    stats.fps = 999;
    assert.equal(monitor.getFPS(), 50);
    assert.equal(requests(), 0);
    monitor.destroy();
});

test('an idle window reports zero FPS without requesting frames', t => {
    const { monitor, frame, advance, requests } = fixture(t);
    monitor.getFPS();
    for (let index = 0; index < 50; index++) frame();
    advance(1200);
    const stats = monitor.getStats();
    assert.equal(stats.fps, 0);
    assert.equal(stats.frames, 0);
    assert.equal(stats.renderTime, undefined);
    assert.equal(stats.state, 'idle');
    assert.equal(requests(), 0);
    monitor.destroy();
});

test('panel visibility and reset preserve a single set of statistics listeners', t => {
    const { viewer, monitor, frame, visibilityListeners, requests } = fixture(t);
    monitor.show();
    monitor.show();
    assert(monitor.visible);
    assert.equal(viewer.scene.preRender.numberOfListeners, 1);
    assert.equal(viewer.scene.postRender.numberOfListeners, 1);
    assert.equal(visibilityListeners.size, 1);
    for (let index = 0; index < 50; index++) frame();
    monitor.hide();
    assert(!monitor.visible);
    assert.equal(monitor.getFPS(), 50);
    const before = requests();
    monitor.reset();
    assert.equal(monitor.getStats().state, 'sampling');
    assert.equal(monitor.getFPS(), 0);
    assert.equal(requests(), before);
    assert.equal(viewer.scene.postRender.numberOfListeners, 1);
    monitor.destroy();
});

test('hidden pages ignore frames and resume with a fresh window', t => {
    const { monitor, frame, advance, document } = fixture(t);
    monitor.getStats();
    for (let index = 0; index < 50; index++) frame();
    document.hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    advance(5000);
    frame();
    assert.equal(monitor.getStats().state, 'hidden');
    assert.equal(monitor.getFPS(), 0);
    document.hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    for (let index = 0; index < 50; index++) frame();
    assert.equal(monitor.getFPS(), 50);
    assert.equal(monitor.getStats().renderTime, 4);
    monitor.destroy();
});

test('a partial frame after reset has no invented render duration', t => {
    const { viewer, monitor, advance } = fixture(t);
    monitor.getStats();
    viewer.scene.preRender.raiseEvent();
    advance(20);
    monitor.reset();
    advance(1000);
    viewer.scene.postRender.raiseEvent();
    const stats = monitor.getStats();
    assert.equal(stats.frames, 1);
    assert.equal(stats.renderTime, undefined);
    monitor.destroy();
});

test('initial native visibility is readable without starting statistics', t => {
    const { viewer, monitor } = fixture(t);
    viewer.scene.debugShowFramesPerSecond = true;
    assert(monitor.visible);
    assert.equal(viewer.scene.preRender.numberOfListeners, 0);
    monitor.destroy();
});

test('destroy is repeatable and removes frame and document listeners', t => {
    const { viewer, monitor, visibilityListeners, destroyViewer } = fixture(t);
    monitor.show();
    monitor.destroy();
    monitor.destroy();
    assert(monitor.isDestroyed());
    assert(!viewer.scene.debugShowFramesPerSecond);
    assert.equal(viewer.scene.preRender.numberOfListeners, 0);
    assert.equal(viewer.scene.postRender.numberOfListeners, 0);
    assert.equal(visibilityListeners.size, 0);
    assert.throws(() => monitor.getStats(), /已销毁/);
    assert.throws(() => monitor.reset(), /已销毁/);
    destroyViewer();
    monitor.hide();
    assert.throws(() => new FPSMonitor(viewer), /已销毁/);
});
