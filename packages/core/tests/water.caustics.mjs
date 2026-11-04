import assert from 'node:assert/strict';

export async function verifyCaustics(page) {
  await page.evaluate(() => {
    window.causticsSaved = { ...water.material.uniforms };
    window.causticsSavedTime = C.JulianDate.clone(viewer.clock.currentTime);
    params.hour = 12; updateSun();
    water.update({ waveHeight: .2, waveLength: 35, amplitude: 1, rippleStrength: .7, frequency: 100,
      refraction: true, refractionStrength: 0, foam: false, reflectionStrength: 0, specularIntensity: 0,
      caustics: false, causticsIntensity: 2, causticsMaxDepth: 12, debugView: 'caustics' });
    water.material.uniforms.time = 0;
    viewer.camera.lookAt(at(190, -100, 2.5), new C.HeadingPitchRange(0, C.Math.toRadians(-55), 180));
    viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  });
  const frame = () => page.evaluate(() => new Promise(resolve => {
    const remove = viewer.scene.postRender.addEventListener(() => { remove(); resolve(); }); viewer.scene.requestRender();
  }));
  const read = () => page.evaluate(() => new Promise(resolve => {
    const remove = viewer.scene.postRender.addEventListener(() => {
      remove();
      const bytes = viewer.scene.context.readPixels({ x: 400, y: 370, width: 320, height: 160 });
      let sum = 0, squares = 0, max = 0, hash = 2166136261;
      for (let i = 0; i < bytes.length; i += 4) {
        const v = bytes[i]; sum += v; squares += v * v; max = Math.max(max, v);
        hash = Math.imul(hash ^ v, 16777619);
      }
      const mean = sum / (bytes.length / 4);
      resolve({ mean, max, variance: squares / (bytes.length / 4) - mean * mean, hash: hash >>> 0 });
    }); viewer.scene.requestRender();
  }));
  const update = async options => { await page.evaluate(options => water.update(options), options); await frame(); return read(); };
  await frame(); await frame();
  const off = await read();
  assert.equal(off.max, 0, 'Caustic observation must be dark when disabled');
  const on = await update({ caustics: true });
  assert(on.mean > 1 && on.variance > 2, `Actual bottom must show varying focused light: ${JSON.stringify({ off, on })}`);
  const stopped = await read();
  assert.equal(stopped.hash, on.hash, 'Paused caustics must be stable');
  await page.evaluate(() => { water.material.uniforms.time = 1.7; viewer.scene.requestRender(); });
  await frame(); const moved = await read();
  assert.notEqual(moved.hash, on.hash, 'Caustics must follow the wave clock');
  const flat = await update({ waveHeight: 0, amplitude: 0 });
  assert.equal(flat.max, 0, `A flat surface must not manufacture focused light: ${JSON.stringify(flat)}`);
  const limited = await update({ waveHeight: .2, amplitude: 1, causticsMaxDepth: .1 });
  assert.equal(limited.max, 0, 'Caustics must stop beyond the configured water depth');
  await update({ causticsMaxDepth: 12 });
  await page.evaluate(() => { params.hour = 0; updateSun(); });
  await frame(); await frame(); const night = await read();
  assert.equal(night.max, 0, 'Caustics must disappear when the real Cesium sun is below the horizon');
  await page.evaluate(() => { params.hour = 12; updateSun(); water.material.uniforms.time = 0; });
  await frame(); await frame();
  const noon = await read();
  assert(noon.mean > 1);
  const hidden = await page.evaluate(() => {
    // Keep the water but remove all actual receivers, including the globe.
    const visibility = viewer.entities.values.map(e => e.show);
    viewer.entities.values.forEach(e => { e.show = false; });
    const globe = viewer.scene.globe.show; viewer.scene.globe.show = false; viewer.scene.requestRender();
    return { visibility, globe };
  });
  await frame(); await frame(); const noBottom = await read();
  assert.equal(noBottom.max, 0, 'Missing underwater receivers must not produce caustics');
  await page.evaluate(({visibility, globe}) => {
    viewer.entities.values.forEach((e, i) => { e.show = visibility[i]; }); viewer.scene.globe.show = globe;
    viewer.scene.requestRender();
  }, hidden);
  await frame(); await frame();
  // A flat receiver isolates lighting-coordinate continuity from actual depth edges.
  await page.evaluate(() => {
    water.update({ waveHeight: 0 });
    window.samplingReceiver = viewer.scene.primitives.add(new C.Primitive({
      geometryInstances: new C.GeometryInstance({
        geometry: C.BoxGeometry.fromDimensions({ dimensions: new C.Cartesian3(180, 180, 1), vertexFormat: C.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT }),
        attributes: { color: C.ColorGeometryInstanceAttribute.fromColor(C.Color.WHITE) },
      }),
      modelMatrix: C.Matrix4.setTranslation(frame, at(190, -100, 1.2), new C.Matrix4()),
      appearance: new C.PerInstanceColorAppearance({ translucent: false, flat: true }), asynchronous: false,
    }));
  });
  await frame(); await frame();
  await page.evaluate(() => new Promise(resolve => {
    const remove = viewer.scene.postRender.addEventListener(() => {
      remove(); window.causticSamplingPixels = viewer.scene.context.readPixels({ x: 400, y: 370, width: 320, height: 160 }); resolve();
    }); viewer.scene.requestRender();
  }));
  const resizeCapture = async size => {
    await page.evaluate(size => {
      const pass = water.underwaterPass;
      pass.framebuffer.destroy(); pass.framebuffer = pass.texture = pass.depthTexture = undefined;
      pass.size = size; viewer.scene.requestRender();
    }, size);
    await frame(); await frame();
  };
  const captureSize = await page.evaluate(() => water.underwaterPass.size);
  await resizeCapture(512);
  const samplingDifference = await page.evaluate(() => new Promise(resolve => {
    const remove = viewer.scene.postRender.addEventListener(() => {
      remove();
      const pixels = viewer.scene.context.readPixels({ x: 400, y: 370, width: 320, height: 160 });
      let difference = 0;
      for (let i = 0; i < pixels.length; i += 4) difference += Math.abs(pixels[i] - causticSamplingPixels[i]);
      resolve(difference / (pixels.length / 4));
    }); viewer.scene.requestRender();
  }));
  assert(samplingDifference < 2, `Flat-bottom caustics must not snap to the depth texture grid when capture resolution changes: ${samplingDifference}`);
  await resizeCapture(captureSize);
  await page.evaluate(() => { viewer.scene.primitives.remove(samplingReceiver); water.update({ waveHeight: .2 }); });
  await frame(); await frame();
  await update({ debugView: 'surface', caustics: false });
  const surfaceOff = await read();
  await update({ caustics: true }); const surfaceOn = await read();
  assert(surfaceOn.mean > surfaceOff.mean, 'Focused light must contribute to the final refracted surface, not only a debug view');
  if (process.env.WATER_CAUSTICS_SCREENSHOT) await page.screenshot({ path: process.env.WATER_CAUSTICS_SCREENSHOT });
  await page.evaluate(() => {
    const u = causticsSaved;
    water.update({ waveHeight: u.waveHeight, waveLength: u.waveLength, amplitude: u.amplitude, rippleStrength: u.rippleStrength,
      frequency: u.frequency, refraction: u.refraction > 0, refractionStrength: u.refractionStrength, foam: u.foam > 0,
      reflectionStrength: u.reflectionStrength, specularIntensity: u.specularIntensity, caustics: u.caustics > 0,
      causticsIntensity: u.causticsIntensity, causticsMaxDepth: u.causticsMaxDepth, debugView: 'surface' });
    water.material.uniforms.time = u.time;
    viewer.clock.currentTime = C.JulianDate.clone(causticsSavedTime);
    params.hour = 15;
    locate();
  });
  await frame(); await frame();
  console.log('PASS: actual caustic light, wave-clock motion, pause, flat-water limit, depth limit, real sun/night, receiver masking, continuous lighting coordinates, final surface contribution', JSON.stringify({ on, flat, limited, night, noBottom, samplingDifference, surfaceOff, surfaceOn }));
}
