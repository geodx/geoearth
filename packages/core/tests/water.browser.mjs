// Build the SDK and demo first. Supply PLAYWRIGHT_MODULE / BROWSER_EXECUTABLE if needed.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyAdvancedWater } from './water.advanced.mjs';
import { verifyProceduralWater } from './water.procedural.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
  const base = path.resolve(root, pathname.startsWith('/sdk/') ? 'packages/core/dist' : 'examples/vue-demo/dist');
  const file = path.resolve(base, '.' + (pathname.startsWith('/sdk/') ? pathname.slice(4) : pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const content = await readFile(file);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.gltf': 'model/gltf+json' };
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.end(content);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const errors = [];
try {
  browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || undefined, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const origin = 'http://127.0.0.1:' + server.address().port;
  if (process.env.WATER_ONLINE_ONLY !== '1') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const normalMapRequests = [];
  await page.route('**/waterNormals.jpg', route => { normalMapRequests.push(route.request().url()); return route.abort(); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  await page.goto(origin + '/demos/effects/water.html?offline=1');
  await page.waitForFunction(() => water?.reflectionPass.ready && viewer.entities.values.filter(e => e.name.startsWith('岸边建筑')).length === 3);
  await page.waitForTimeout(1800);
  await page.locator('#pause').click();
  await page.waitForTimeout(300);
  const time = await page.evaluate(() => water.material.uniforms.time);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => water.material.uniforms.time), time);
  await verifyProceduralWater(page);
  assert.deepEqual(normalMapRequests, [], 'WaterEffect must render without requesting a normal-map image');
  await verifyAdvancedWater(page);
  // Read the actual offscreen texture: building visibility must change its contents.
  const hashReflection = () => page.evaluate(() => {
    const pass = water.reflectionPass;
    const bytes = viewer.scene.context.readPixels({ framebuffer: pass.framebuffer, width: 1024, height: 1024 });
    let hash = 2166136261;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
    return hash >>> 0;
  });
  const reflection = await hashReflection();
  await page.evaluate(() => water.update({ skyReflection: false }));
  await page.waitForTimeout(300);
  assert.notEqual(await hashReflection(), reflection, 'Scene sky and atmosphere must be reflected');
  await page.evaluate(() => water.update({ skyReflection: true }));
  await page.waitForTimeout(300);
  assert.equal(await hashReflection(), reflection, 'Sky rendering must restore main camera state');
  await page.evaluate(() => { viewer.entities.values.filter(e => e.name.startsWith('岸边建筑')).forEach(e => { e.show = false; }); viewer.scene.requestRender(); });
  await page.waitForTimeout(250);
  assert.notEqual(await hashReflection(), reflection, 'Buildings must appear in the actual reflection texture');
  await page.evaluate(() => { viewer.entities.values.filter(e => e.name.startsWith('岸边建筑')).forEach(e => { e.show = true; }); viewer.scene.requestRender(); });
  await page.waitForTimeout(250);
  assert.equal(await hashReflection(), reflection, 'Restoring buildings must restore their reflection');
  await page.evaluate(() => { viewer.entities.values.filter(e => ['水底', '水底石块'].includes(e.name)).forEach(e => { e.show = false; }); viewer.scene.requestRender(); });
  await page.waitForTimeout(250);
  assert.equal(await hashReflection(), reflection, 'Underwater objects must be clipped from the reflection');
  await page.evaluate(() => { viewer.entities.values.filter(e => ['水底', '水底石块'].includes(e.name)).forEach(e => { e.show = true; }); viewer.scene.requestRender(); });
  // Real glTF Model and 3D Tiles content, generated locally without external services.
  await page.evaluate(async () => {
    const geometry = C.BoxGeometry.createGeometry(C.BoxGeometry.fromDimensions({ dimensions: new C.Cartesian3(1, 1, 1), vertexFormat: C.VertexFormat.POSITION_ONLY }));
    const positions = new Float32Array(geometry.attributes.position.values);
    const indices = new Uint16Array(geometry.indices);
    const bytes = new Uint8Array(positions.byteLength + indices.byteLength);
    bytes.set(new Uint8Array(positions.buffer)); bytes.set(new Uint8Array(indices.buffer), positions.byteLength);
    const data = value => 'data:application/json;base64,' + btoa(JSON.stringify(value));
    const gltf = data({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
      materials: [{ pbrMetallicRoughness: { baseColorFactor: [.9, .2, .55, 1], metallicFactor: 0, roughnessFactor: 1 }, doubleSided: true }],
      buffers: [{ byteLength: bytes.length, uri: 'data:application/octet-stream;base64,' + btoa(String.fromCharCode(...bytes)) }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 }, { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength, target: 34963 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: [-.5, -.5, -.5], max: [.5, .5, .5] }, { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' }],
    });
    const transform = (x, y, scale) => C.Matrix4.multiplyByUniformScale(C.Transforms.eastNorthUpToFixedFrame(at(x, y, scale / 2)), scale, new C.Matrix4());
    window.fixtureModel = viewer.scene.primitives.add(await C.Model.fromGltfAsync({ url: gltf, modelMatrix: transform(290, 290, 80) }));
    window.fixtureTileset = viewer.scene.primitives.add(await C.Cesium3DTileset.fromUrl(data({ asset: { version: '1.1' }, geometricError: 1000,
      root: { boundingVolume: { box: [0, 0, 0, .6, 0, 0, 0, .6, 0, 0, 0, .6] }, transform: C.Matrix4.toArray(transform(-310, 260, 65)), geometricError: 0, refine: 'ADD', content: { uri: gltf } },
    })));
    viewer.scene.requestRender();
  });
  await page.waitForFunction(() => fixtureModel.ready && fixtureTileset.root.contentReady, null, { timeout: 10000 }).catch(async error => {
    console.log(JSON.stringify({ errors, diagnostic: await page.evaluate(() => ({ loop: viewer.useDefaultRenderLoop, model: fixtureModel.ready, loaded: fixtureTileset.tilesLoaded, content: fixtureTileset.root._contentState, selected: fixtureTileset._selectedTiles.length, commands: fixtureTileset._statistics.numberOfCommands, status: document.getElementById('status').textContent })) }));
    throw error;
  });
  await page.waitForTimeout(500);
  const modelReflection = await hashReflection();
  // A real depth pick clears the main render flags before preRender. Reflection
  // must still use its own render pass, including when a 3D Tiles model is present.
  const afterPick = await page.evaluate(() => new Promise(resolve => {
    const remove = viewer.scene.postUpdate.addEventListener(() => {
      remove();
      viewer.scene.pickPosition(new C.Cartesian2(640, 450));
      const cleared = !viewer.scene._frameState.passes.render;
      const removeRendered = viewer.scene.postRender.addEventListener(() => {
        removeRendered();
        resolve({ cleared, ready: water.reflectionPass.ready, uniform: water.material.uniforms.reflectionReady });
      });
    });
    viewer.scene.requestRender();
  }));
  assert.deepEqual(afterPick, { cleared: true, ready: true, uniform: 1 });
  assert.equal(await hashReflection(), modelReflection, 'Depth picking must preserve building/model/3D Tiles reflections');
  await page.evaluate(() => { fixtureModel.show = false; viewer.scene.requestRender(); });
  await page.waitForTimeout(250);
  const tilesReflection = await hashReflection();
  assert.notEqual(tilesReflection, modelReflection, 'glTF models must be reflected');
  await page.evaluate(() => { fixtureTileset.show = false; viewer.scene.requestRender(); });
  await page.waitForTimeout(250);
  assert.notEqual(await hashReflection(), tilesReflection, '3D Tiles content must be reflected');
  await page.evaluate(() => { viewer.scene.primitives.remove(fixtureModel); viewer.scene.primitives.remove(fixtureTileset); });
  // Continuous native wheel input, with the camera event threshold unchanged
  // and then raised to 100%. Rendering must not depend on camera.changed.
  await page.evaluate(() => {
    window.zoomFrames = [];
    const pass = water.reflectionPass;
    const render = pass.render.bind(pass);
    window.restoreReflectionProbe = () => { pass.render = render; };
    pass.render = (...args) => {
      const mainRender = viewer.scene._frameState.passes.render;
      const inverse = C.Matrix4.inverseTransformation(frame, new C.Matrix4());
      const height = C.Matrix4.multiplyByPoint(inverse, viewer.camera.positionWC, new C.Cartesian3()).z - 2.5;
      render(...args);
      zoomFrames.push({ mainRender, height, ready: pass.ready, threshold: viewer.camera.percentageChanged });
    };
  });
  await page.mouse.move(560, 520);
  for (const threshold of [.01, 1]) {
    await page.evaluate(threshold => { viewer.camera.percentageChanged = threshold; }, threshold);
    for (const direction of [-1, 1, -1, 1]) {
      for (let step = 0; step < 3; step++) {
        await page.mouse.wheel(0, direction * 12);
        await page.waitForTimeout(90);
      }
    }
  }
  await page.waitForTimeout(300);
  const zoom = await page.evaluate(() => {
    restoreReflectionProbe();
    viewer.camera.percentageChanged = .01;
    return { frames: zoomFrames.length, picked: zoomFrames.filter(f => !f.mainRender).length,
      thresholds: [...new Set(zoomFrames.map(f => f.threshold))], invalid: zoomFrames.filter(f => f.height <= .05 || !f.ready) };
  });
  assert(zoom.frames > 10 && zoom.picked > 0, 'Wheel test must exercise actual depth picking and rendered movement');
  assert.deepEqual(zoom.thresholds, [.01, 1]);
  assert.deepEqual(zoom.invalid, [], 'Reflections must remain ready on every zoom frame above water');
  console.log('PASS: depth-pick and continuous zoom reflection regression', JSON.stringify(zoom));
  await page.locator('#locate').click();
  const primitiveCount = await page.evaluate(() => viewer.scene.primitives.length);
  for (const style of ['sea', 'shallow', 'lake']) {
    await page.locator('#style').selectOption(style);
    assert.equal(await page.evaluate(() => water.material.uniforms.animationSpeed), 0);
  }
  await page.locator('#reflection').uncheck();
  await page.waitForFunction(() => !water.reflectionPass.ready);
  assert.equal(await page.evaluate(() => water.reflectionPass.ready), false);
  await page.locator('#reflection').check();
  await page.waitForFunction(() => water.reflectionPass.ready);
  await page.locator('#enabled').uncheck();
  assert.equal(await page.evaluate(() => water.show), false);
  await page.locator('#enabled').check();
  await page.locator('#pause').click();
  await page.waitForFunction(t => water.material.uniforms.time > t, time);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.locator('#locate').click();
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => viewer.scene.primitives.length), primitiveCount);
  assert.equal(await page.evaluate(() => viewer.useDefaultRenderLoop), true);
  // Parameter panel changes go through the public update API.
  await page.evaluate(() => {
    gui.controllersRecursive().find(controller => controller.property === 'waveLength').setValue(120);
    gui.controllersRecursive().find(controller => controller.property === 'roughness').setValue(.35);
  });
  assert.deepEqual(await page.evaluate(() => [water.material.uniforms.waveLength, water.material.uniforms.roughness]), [120, .35]);
  await page.evaluate(() => {
    params.hour = 12; updateSun();
  });
  await page.waitForFunction(() => Math.abs(C.JulianDate.secondsDifference(viewer.scene._frameState.time, viewer.clock.currentTime)) < .01);
  const middayDirection = await page.evaluate(() => C.Cartesian3.clone(viewer.scene.context.uniformState.sunDirectionWC));
  await page.evaluate(() => { params.hour = 0; updateSun(); });
  await page.waitForFunction(() => Math.abs(C.JulianDate.secondsDifference(viewer.scene._frameState.time, viewer.clock.currentTime)) < .01);
  const nightDirection = await page.evaluate(() => C.Cartesian3.clone(viewer.scene.context.uniformState.sunDirectionWC));
  assert.notDeepEqual(nightDirection, middayDirection, 'Sun direction must track Cesium simulation time');
  assert.equal(await page.evaluate(() => {
    const s = viewer.scene.context.uniformState;
    return C.Cartesian3.equalsEpsilon(C.Cartesian3.normalize(s.sunPositionWC, new C.Cartesian3()), s.sunDirectionWC, 1e-12);
  }), true);
  await page.evaluate(() => { params.hour = 15; updateSun(); });
  await page.locator('#sun-view').click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => viewer.useDefaultRenderLoop), true);
  await page.locator('#locate').click();
  // Lifecycle, a Viewer-only host, holes, independent water resources and input rejection.
  assert.equal(await page.evaluate(() => {
    const count = viewer.scene.primitives.length;
    const second = new GeoEarth.WaterEffect(viewer, { hierarchy: [{longitude:110, latitude:30}, {longitude:110.001, latitude:30}, {longitude:110.001, latitude:30.001}], reflectionSize: 64 });
    second.update({ amplitude: 0.2, frequency: undefined });
    if (second.material.uniforms.frequency !== 100) throw new Error('Undefined style must preserve values');
    second.destroy(); second.destroy();
    let rejected = false;
    try { water.update({ amplitude: NaN }); } catch { rejected = true; }
    return second.isDestroyed() && rejected && viewer.scene.primitives.length === count;
  }), true);
  if (process.env.WATER_SCREENSHOT) await page.screenshot({ path: process.env.WATER_SCREENSHOT });
  await page.evaluate(() => {
    window.savedWater = water;
    window.savedMaterial = water.material;
    window.savedFramebuffer = water.reflectionPass.framebuffer;
    window.savedUnderwaterFramebuffer = water.underwaterPass.framebuffer;
    window.savedDepthTexture = water.underwaterPass.depthTexture;
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
  });
  assert.deepEqual(await page.evaluate(() => ({ viewer: viewer.isDestroyed(), water: savedWater.isDestroyed(), primitive: savedWater.primitive.isDestroyed(), material: savedMaterial.isDestroyed(), framebuffer: savedFramebuffer.isDestroyed() })), { viewer: true, water: true, primitive: true, material: true, framebuffer: true });
  assert.equal(await page.evaluate(() => savedUnderwaterFramebuffer.isDestroyed() && savedDepthTexture.isDestroyed()), true);
  await page.close();
  const app = await browser.newPage();
  app.on('pageerror', error => errors.push(error.message));
  await app.route('**/demos/effects/water.html', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace("const offline = new URLSearchParams(location.search).has('offline');", 'const offline = true;') });
  });
  await app.goto(origin + '/#/examples/effect-water');
  await app.frameLocator('iframe.preview-frame').locator('#status[data-state="ready"]').waitFor();
  await app.frameLocator('iframe.preview-frame').locator('#style').selectOption('sea');
  await app.frameLocator('iframe.preview-frame').locator('#pause').click();
  await app.close();
  }
  if (process.env.WATER_ONLINE === '1') {
    const online = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    online.on('pageerror', error => errors.push(error.message));
    await online.goto(origin + '/demos/effects/water.html');
    await online.waitForFunction(() => onlineImagery && onlineTerrain && water?.reflectionPass.ready, null, { timeout: 45000 });
    await online.waitForFunction(() => viewer.scene.globe.tilesLoaded, null, { timeout: 60000 }).catch(async error => {
      console.log('ONLINE DIAGNOSTIC', JSON.stringify(await online.evaluate(() => {
        const surface = viewer.scene.globe._surface;
        return { status: document.getElementById('resource-status').textContent, loop: viewer.useDefaultRenderLoop,
          terrain: viewer.terrainProvider.constructor.name, tiles: surface._tilesToRender.map(t => ({level:t.level, state:t.state})),
          queues: [surface._tileLoadQueueHigh.length, surface._tileLoadQueueMedium.length, surface._tileLoadQueueLow.length],
          water: water.underwaterPass.ready, reflection: water.reflectionPass.ready };
      })));
      if (process.env.WATER_ONLINE_SCREENSHOT) await online.screenshot({ path: process.env.WATER_ONLINE_SCREENSHOT });
      throw error;
    });
    await online.locator('#pause').click();
    await online.waitForTimeout(500);
    const terrainBefore = await online.screenshot({ clip: { x: 600, y: 90, width: 350, height: 180 } });
    await online.locator('#reflection').uncheck();
    await online.waitForFunction(() => !water.reflectionPass.ready);
    const terrainAfter = await online.screenshot({ clip: { x: 600, y: 90, width: 350, height: 180 } });
    assert(terrainBefore.equals(terrainAfter), 'Reflection rendering must preserve the main terrain and sky');
    await online.locator('#reflection').check();
    await online.waitForFunction(() => water.reflectionPass.ready);
    if (process.env.WATER_ONLINE_SCREENSHOT) await online.screenshot({ path: process.env.WATER_ONLINE_SCREENSHOT });
    await online.locator('#sun-view').click();
    await online.waitForTimeout(500);
    if (process.env.WATER_SUN_SCREENSHOT) await online.screenshot({ path: process.env.WATER_SUN_SCREENSHOT });
    await online.close();
    console.log('PASS: official default-token Bing imagery and World Terrain, main terrain preserved, solar reflection view');
  }
  assert.deepEqual(errors, []);
  if (process.env.WATER_ONLINE_ONLY !== '1') console.log('PASS: sky/atmosphere reflection, Cesium solar position, parameter panel, real reflection pixels, underwater clipping, glTF Model, 3D Tiles, presets, pause/resume, toggles, resize, lifecycle, production menu');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

