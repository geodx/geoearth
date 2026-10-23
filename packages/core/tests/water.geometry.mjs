import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { Cartesian3, EllipsoidSurfaceAppearance, Matrix4, PolygonGeometry, PolygonHierarchy, Transforms } from 'cesium';

const source = await readFile(new URL('../src/ts/effects/water/waterGeometry.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace("from 'cesium'", `from '${import.meta.resolve('cesium')}'`);
const { refineWaterGeometry } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const frame = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(110, 30));
const inverse = Matrix4.inverseTransformation(frame, new Matrix4());
const at = (x, y) => Matrix4.multiplyByPoint(frame, new Cartesian3(x, y, 0), new Cartesian3());
const hierarchy = new PolygonHierarchy([[0, 0], [120, 0], [120, 40], [80, 40], [80, 100], [0, 100]].map(p => at(...p)), [
  new PolygonHierarchy([[20, 20], [20, 40], [40, 40], [40, 20]].map(p => at(...p))),
]);
const polygon = PolygonGeometry.createGeometry(new PolygonGeometry({ polygonHierarchy: hierarchy, vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT }));
const geometry = refineWaterGeometry(polygon, hierarchy, inverse, 8);
const p = geometry.attributes.position.values, st = geometry.attributes.st.values, indices = geometry.indices;
const edges = new Map(); let area = 0;
for (let i = 0; i < indices.length; i += 3) {
  const [a, b, c] = indices.slice(i, i + 3);
  area += Math.abs((p[b * 3] - p[a * 3]) * (p[c * 3 + 1] - p[a * 3 + 1]) - (p[b * 3 + 1] - p[a * 3 + 1]) * (p[c * 3] - p[a * 3])) / 2;
  const x = (p[a * 3] + p[b * 3] + p[c * 3]) / 3, y = (p[a * 3 + 1] + p[b * 3 + 1] + p[c * 3 + 1]) / 3;
  assert(!(x > 20.001 && x < 39.999 && y > 20.001 && y < 39.999), 'Island hole must remain empty');
  for (const [u, v] of [[a,b],[b,c],[c,a]]) {
    assert(Math.hypot(p[u*3]-p[v*3], p[u*3+1]-p[v*3+1]) <= 8.000001, 'All mesh edges must respect spacing');
    const key = u < v ? `${u}:${v}` : `${v}:${u}`; edges.set(key, (edges.get(key) ?? 0) + 1);
  }
}
assert(Math.abs(area - 9200) < .5, `Concave outline and hole area must be conserved: ${area}`);
for (const [key, count] of edges) {
  assert(count === 1 || count === 2);
  if (count === 1) {
    const [a,b] = key.split(':').map(Number);
    assert(st[a*2] < .01 && st[b*2] < .01, 'No interior cracks or unmatched triangle edges');
  }
}
assert(Math.max(...st.filter((_, i) => i % 2 === 0)) > 10, 'Interior shoreline distances must be present');
console.log('PASS: concave water mesh, island holes, max edge length, shared edges, preserved area, shoreline distances', JSON.stringify({ vertices: p.length/3, triangles: indices.length/3, area }));
