import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/ts/effects/water/waterWaves.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { waterWaveFunctions } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

export async function verifyProceduralWater(page) {
  assert.equal(await page.evaluate(() => 'normalMap' in water.material.uniforms || /\bnormalMap\b/.test(water.material.shaderSource)), false);
  // Compare analytic slopes with independent finite differences of the actual GLSL height function.
  const derivativeErrors = await page.evaluate(glsl => {
    const context = viewer.scene.context;
    const framebuffer = new C.Framebuffer({ context, colorTextures: [new C.Texture({ context, width: 1, height: 1 })] });
    let point = new C.Cartesian2();
    const command = context.createViewportQuadCommand(`${glsl}
uniform vec2 testPoint;
vec4 surface(vec2 p) {
    vec3 phaseNoise = waterPhaseNoise(p * 0.12);
    phaseNoise.yz *= 0.12;
    return waterDirectionalWave(p, vec2(0.8, 0.6), 2.7, 0.2, 0.9, phaseNoise, 0.7);
}
void main() {
    // A centimetre step avoids amplifying float32 subtraction noise.
    float e = 0.01;
    vec2 finiteDifference = vec2(surface(testPoint + vec2(e, 0)).x - surface(testPoint - vec2(e, 0)).x,
        surface(testPoint + vec2(0, e)).x - surface(testPoint - vec2(0, e)).x) / (2.0 * e);
    out_FragColor = vec4(abs(surface(testPoint).yz - finiteDifference) * 100.0, 0.0, 1.0);
}`, { framebuffer, uniformMap: { testPoint: () => point }, renderState: C.RenderState.fromCache({ viewport: new C.BoundingRectangle(0, 0, 1, 1) }) });
    const viewport = C.BoundingRectangle.clone(context.uniformState.viewport);
    try {
      return [[0, 0], [.2, .3], [-1.8, 2.6], [4.2, -3.8], [8.333333, 0], [-8.333333, 2]].map(([x, y]) => {
        point = new C.Cartesian2(x, y); command.execute(context);
        const bytes = context.readPixels({ framebuffer, width: 1, height: 1 });
        return [bytes[0], bytes[1]];
      });
    } finally { command.shaderProgram.destroy(); framebuffer.destroy(); context.uniformState.viewport = viewport; }
  }, waterWaveFunctions);
  // Allow 3e-4 absolute slope error for GPU trig approximation and RGBA8 readback rounding.
  assert(derivativeErrors.flat().every(error => (error + .5) / 255 / 100 < .0003),
    `Analytic wave/noise derivatives must match finite differences, including noise-cell boundaries: ${JSON.stringify(derivativeErrors)}`);
  const frame = () => page.evaluate(() => new Promise(resolve => {
    const remove = viewer.scene.postRender.addEventListener(() => { remove(); resolve(); }); viewer.scene.requestRender();
  }));
  await page.evaluate(() => {
    window.proceduralSaved = { ...water.material.uniforms };
    water.update({ waveHeight: 0, amplitude: 0, rippleStrength: 0, frequency: 100, refraction: false, foam: false, debugView: 'normals' });
    viewer.camera.lookAt(at(80, -140, 2.5), new C.HeadingPitchRange(0, C.Math.toRadians(-55), 180));
    viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
  });
  const capture = async options => {
    await page.evaluate(options => water.update(options), options); await frame();
    return page.screenshot({ clip: { x: 140, y: 180, width: 650, height: 550 } });
  };
  const flat = await capture({ amplitude: 0 });
  const waves = await capture({ amplitude: .8 });
  assert(!flat.equals(waves), 'Procedural wave gradients must change actual normal-view pixels');
  const ripples = await capture({ rippleStrength: .8 });
  assert(!waves.equals(ripples), 'Resolved micro-wave gradients must produce actual pixels');
  const rotated = await capture({ waveDirection: 145 });
  assert(!ripples.equals(rotated), 'Wind direction must rotate the procedural normal field');
  const dense = await capture({ frequency: 160 });
  assert(!rotated.equals(dense), 'Density must change the spatial wave pattern');
  await page.evaluate(() => { water.material.uniforms.time += 3.2; viewer.scene.requestRender(); });
  await frame(); const moved = await page.screenshot({ clip: { x: 140, y: 180, width: 650, height: 550 } });
  assert(!dense.equals(moved), 'Wave time must advance the procedural normal field');
  const disabled = await capture({ frequency: 0 });
  assert(flat.equals(disabled), 'Zero density must leave the same geometric normal as zero detail strength');
  if (process.env.WATER_NORMAL_SCREENSHOT) {
    await capture({ frequency: 100 });
    await page.screenshot({ path: process.env.WATER_NORMAL_SCREENSHOT });
  }
  await page.evaluate(() => {
    const u = proceduralSaved;
    water.update({ waveHeight: u.waveHeight, amplitude: u.amplitude, rippleStrength: u.rippleStrength, frequency: u.frequency,
      waveDirection: u.waveDirection, refraction: u.refraction > 0, foam: u.foam > 0, debugView: 'surface' });
    water.material.uniforms.time = u.time;
    locate();
  });
  await frame(); await frame();
  console.log('PASS: texture-free wave normals, analytic GLSL derivatives, density/direction/ripples/time, geometric-only fallback', JSON.stringify({ derivativeErrors }));
}
