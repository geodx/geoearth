import assert from 'node:assert/strict';

/** Exercise actual GPU depth/color rather than only checking uniform values. */
export async function verifyAdvancedWater(page) {
  await page.waitForFunction(() => water.underwaterPass.ready);
  await page.evaluate(() => {
    window.waterSavedStyle = { ...water.material.uniforms };
    water.update({ waveHeight: 0, amplitude: 0, rippleStrength: 0, reflectionStrength: 0, specularIntensity: 0, foam: false, refraction: true });
    viewer.camera.lookAt(at(0, -40, 2.5), new C.HeadingPitchRange(0, C.Math.toRadians(-55), 750));
    viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
    // Synchronous geometry isolates the depth test from Entity worker scheduling.
    window.depthFixture = viewer.scene.primitives.add(new C.Primitive({
      geometryInstances: new C.GeometryInstance({
        geometry: C.BoxGeometry.fromDimensions({ dimensions: new C.Cartesian3(100, 100, 1), vertexFormat: C.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT }),
        attributes: { color: C.ColorGeometryInstanceAttribute.fromColor(C.Color.RED) },
      }),
      modelMatrix: C.Matrix4.setTranslation(frame, at(70, -130, 1), new C.Matrix4()),
      appearance: new C.PerInstanceColorAppearance({ translucent: false, flat: true }), asynchronous: false,
    }));
    viewer.scene.requestRender();
  });
  const frame = async () => page.evaluate(() => new Promise(resolve => {
    const remove = viewer.scene.postRender.addEventListener(() => { remove(); resolve(); }); viewer.scene.requestRender();
  }));
  await frame(); await frame();
  const depthAtFixture = () => page.evaluate(() => {
    const context = viewer.scene.context, pass = water.underwaterPass;
    const local = C.Matrix4.multiplyByPoint(C.Matrix4.inverseTransformation(water.primitive.modelMatrix, new C.Matrix4()), at(70, -130, 1.5), new C.Cartesian3());
    const clip = C.Matrix4.multiplyByVector(pass.matrix, new C.Cartesian4(local.x, local.y, local.z, 1), new C.Cartesian4());
    const size = pass.depthTexture.width;
    const uv = new C.Cartesian2((Math.floor((clip.x / clip.w * .5 + .5) * size) + .5) / size, (Math.floor((clip.y / clip.w * .5 + .5) * size) + .5) / size);
    const texture = new C.Texture({ context, width: 1, height: 1 });
    const framebuffer = new C.Framebuffer({ context, colorTextures: [texture] });
    const command = context.createViewportQuadCommand('uniform sampler2D sampleDepth; uniform vec2 sampleUV; void main() { out_FragColor = czm_packDepth(texture(sampleDepth, sampleUV).r); }', {
      framebuffer, uniformMap: { sampleDepth: () => pass.depthTexture, sampleUV: () => uv },
      renderState: C.RenderState.fromCache({ viewport: new C.BoundingRectangle(0, 0, 1, 1) }),
    });
    const viewport = C.BoundingRectangle.clone(context.uniformState.viewport);
    command.execute(context);
    const bytes = context.readPixels({ framebuffer, width: 1, height: 1 });
    const depth = bytes.reduce((sum, value, i) => sum + value / (255 ** (i + 1)), 0);
    const reconstructed = C.Matrix4.multiplyByVector(pass.inverseMatrix, new C.Cartesian4(uv.x * 2 - 1, uv.y * 2 - 1, depth * 2 - 1, 1), new C.Cartesian4());
    const bottomZ = reconstructed.z / reconstructed.w;
    command.shaderProgram.destroy(); framebuffer.destroy(); context.uniformState.viewport = viewport;
    return { bottomZ, depth, size };
  });
  const shallow = await depthAtFixture();
  const expectedZ = await page.evaluate(() => C.Matrix4.multiplyByPoint(C.Matrix4.inverseTransformation(water.primitive.modelMatrix, new C.Matrix4()), at(70, -130, 1.5), new C.Cartesian3()).z);
  assert(Math.abs(shallow.bottomZ - expectedZ) < .08, `Sampled GPU depth must reconstruct the known bottom: ${JSON.stringify({ ...shallow, expectedZ })}`);
  await page.evaluate(() => { water.update({ debugView: 'depth', depthRange: 4 }); locate(); });
  await frame(); await frame();
  const flatDepthColors = await page.evaluate(() => new Promise(resolve => {
    const remove = viewer.scene.postRender.addEventListener(() => {
      remove();
      const scale = viewer.scene.drawingBufferWidth / viewer.canvas.clientWidth;
      const colors = [];
      for (const x of [45, 70, 95]) for (const y of [-155, -130, -105]) {
        const p = C.SceneTransforms.worldToWindowCoordinates(viewer.scene, at(x, y, 2.5));
        colors.push(viewer.scene.context.readPixels({ x: Math.floor(p.x * scale), y: viewer.scene.drawingBufferHeight - 1 - Math.floor(p.y * scale), width: 1, height: 1 })[0]);
      }
      resolve(colors);
    }); viewer.scene.requestRender();
  }));
  assert(Math.max(...flatDepthColors) - Math.min(...flatDepthColors) <= 3 && Math.min(...flatDepthColors) > 50,
    `A flat bottom must have uniform depth colors at a grazing view, without texture-row stripes: ${JSON.stringify(flatDepthColors)}`);
  await page.evaluate(() => {
    water.update({ debugView: 'surface', depthRange: waterSavedStyle.depthRange });
    viewer.camera.lookAt(at(0, -40, 2.5), new C.HeadingPitchRange(0, C.Math.toRadians(-55), 750));
    viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  });
  // Move the same bottom down one metre: reconstructed depth must follow geometry.
  await page.evaluate(() => { depthFixture.modelMatrix = C.Matrix4.setTranslation(frame, at(70, -130, 0), new C.Matrix4()); viewer.scene.requestRender(); });
  await frame(); await frame();
  const deep = await depthAtFixture();
  assert(Math.abs(shallow.bottomZ - deep.bottomZ - 1) < .08, `Depth must follow the moved bottom: ${JSON.stringify({shallow, deep})}`);
  const capture = async options => {
    await page.evaluate(options => water.update(options), options); await frame();
    return page.locator('canvas').first().screenshot();
  };
  const flat = await capture({ waveHeight: 0, debugView: 'depth' });
  const displaced = await capture({ waveHeight: 1.5 });
  assert(!flat.equals(displaced), 'Geometry waves must change depth and silhouette even with procedural-detail strength zero');
  await page.evaluate(() => water.update({ waveHeight: 0 }));
  const raw = await capture({ debugView: 'refraction', refractionStrength: 0 });
  const refracted = await capture({ refractionStrength: 1, amplitude: .5 });
  assert(!raw.equals(refracted), 'Refraction must move actual underwater image features');
  await page.evaluate(() => { water.update({ debugView: 'surface', absorption: new C.Cartesian3(0, 0, 0), amplitude: 0 }); });
  await frame(); const clearImage = await page.locator('canvas').first().screenshot();
  await page.evaluate(() => water.update({ absorption: new C.Cartesian3(1, .3, .1) }));
  await frame(); const absorbedImage = await page.locator('canvas').first().screenshot();
  assert(!clearImage.equals(absorbedImage), 'RGB absorption must change actual surface pixels');
  const withoutFoam = await capture({ debugView: 'foam', foam: false });
  const withFoam = await capture({ foam: true, foamWidth: 1.2, foamOpacity: 1 });
  assert(!withoutFoam.equals(withFoam), 'Depth-based shoreline foam must produce pixels');
  const foamAtFixture = () => page.evaluate(() => new Promise(resolve => {
    const remove = viewer.scene.postRender.addEventListener(() => {
      remove();
      const position = C.SceneTransforms.worldToWindowCoordinates(viewer.scene, at(70, -130, 2.5));
      const scale = viewer.scene.drawingBufferWidth / viewer.canvas.clientWidth;
      const x = Math.round(position.x * scale) - 8, y = viewer.scene.drawingBufferHeight - Math.round(position.y * scale) - 8;
      const pixels = viewer.scene.context.readPixels({ x, y, width: 16, height: 16 });
      let red = 0; for (let i = 0; i < pixels.length; i += 4) red += pixels[i];
      resolve(red / (pixels.length / 4));
    });
    viewer.scene.requestRender();
  }));
  const deepFoam = await foamAtFixture();
  await page.evaluate(() => { depthFixture.modelMatrix = C.Matrix4.setTranslation(frame, at(70, -130, 1.8), new C.Matrix4()); viewer.scene.requestRender(); });
  await frame(); await frame();
  const shallowFoam = await foamAtFixture();
  assert(shallowFoam > deepFoam + 5, `Foam must follow real bottom depth, including away from polygon edges: ${JSON.stringify({deepFoam, shallowFoam})}`);
  if (process.env.WATER_FOAM_SCREENSHOT) await page.screenshot({ path: process.env.WATER_FOAM_SCREENSHOT });
  await page.evaluate(() => {
    viewer.scene.primitives.remove(depthFixture);
    const u = waterSavedStyle;
    water.update({ waveHeight: u.waveHeight, amplitude: u.amplitude, rippleStrength: u.rippleStrength, reflectionStrength: u.reflectionStrength,
      specularIntensity: u.specularIntensity, foam: u.foam > 0, foamWidth: u.foamWidth, foamOpacity: u.foamOpacity, refraction: u.refraction > 0,
      refractionStrength: u.refractionStrength, absorption: u.absorption, debugView: 'surface' });
    locate();
  });
  await frame(); await frame();
  console.log('PASS: displaced mesh, sampled underwater GPU depth, grazing-view depth stability, refraction, RGB absorption and shoreline foam', JSON.stringify({ shallow, deep, flatDepthColors, deepFoam, shallowFoam }));
}

