import { BoundingSphere, Cartesian3, ComponentDatatype, Geometry, GeometryAttribute, GeometryAttributes, Matrix4, PolygonHierarchy, PrimitiveType } from 'cesium'

/** Refine Cesium's triangulation so concave outlines and island holes remain intact. */
export function refineWaterGeometry(geometry: Geometry, hierarchy: PolygonHierarchy, inverse: Matrix4, spacing: number): Geometry {
    const source = geometry.attributes.position.values
    const positions: number[] = []
    const point = new Cartesian3()
    for (let i = 0; i < source.length; i += 3) {
        Matrix4.multiplyByPoint(inverse, Cartesian3.fromElements(source[i], source[i + 1], source[i + 2], point), point)
        positions.push(point.x, point.y, 0)
    }
    const segments: number[][] = []
    const visit = (ring: PolygonHierarchy) => {
        const points = ring.positions.map(p => Matrix4.multiplyByPoint(inverse, p, new Cartesian3()))
        points.forEach((a, i) => { const b = points[(i + 1) % points.length]; segments.push([a.x, a.y, b.x, b.y]) })
        ring.holes?.forEach(visit)
    }
    visit(hierarchy)
    const edgeLength = (a: number, b: number) => (positions[a * 3] - positions[b * 3]) ** 2 + (positions[a * 3 + 1] - positions[b * 3 + 1]) ** 2
    const midpoints = new Map<string, number>()
    const indices: number[] = []
    const split = (a: number, b: number, c: number) => {
        const ab = edgeLength(a, b), bc = edgeLength(b, c), ca = edgeLength(c, a)
        if (Math.max(ab, bc, ca) <= spacing * spacing) { indices.push(a, b, c); return }
        if (bc > ab && bc >= ca) [a, b, c] = [b, c, a]
        else if (ca > ab && ca > bc) [a, b, c] = [c, a, b]
        const key = a < b ? `${a}:${b}` : `${b}:${a}`
        let middle = midpoints.get(key)
        if (middle === undefined) {
            middle = positions.length / 3
            if (middle >= 150000) throw new RangeError('水面网格超过 150000 顶点，请增大 meshSize 或拆分水域。')
            positions.push((positions[a * 3] + positions[b * 3]) / 2, (positions[a * 3 + 1] + positions[b * 3 + 1]) / 2, 0)
            midpoints.set(key, middle)
        }
        split(a, middle, c); split(middle, b, c)
    }
    const original = geometry.indices!
    for (let i = 0; i < original.length; i += 3) split(original[i], original[i + 1], original[i + 2])
    // st stores distance and direction to the closest shoreline, including island holes.
    const st = new Float32Array(positions.length / 3 * 2)
    for (let i = 0; i < positions.length / 3; i++) {
        const x = positions[i * 3], y = positions[i * 3 + 1]
        let distance = Infinity, dx = 0, dy = 0
        for (const [ax, ay, bx, by] of segments) {
            const ex = bx - ax, ey = by - ay
            const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / Math.max(ex * ex + ey * ey, 1e-12)))
            const vx = x - ax - t * ex, vy = y - ay - t * ey, d = vx * vx + vy * vy
            if (d < distance) { distance = d; dx = vx; dy = vy }
        }
        st[i * 2] = Math.sqrt(distance); st[i * 2 + 1] = Math.atan2(dy, dx)
    }
    const values = new Float64Array(positions)
    const bounds = BoundingSphere.fromVertices(values)
    bounds.radius += 25 // Covers the validated maximum vertical and horizontal wave displacement.
    return new Geometry({
        attributes: Object.assign(new GeometryAttributes(), {
            position: new GeometryAttribute({ componentDatatype: ComponentDatatype.DOUBLE, componentsPerAttribute: 3, values }),
            st: new GeometryAttribute({ componentDatatype: ComponentDatatype.FLOAT, componentsPerAttribute: 2, values: st }),
        }),
        indices: positions.length / 3 > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
        primitiveType: PrimitiveType.TRIANGLES, boundingSphere: bounds,
    })
}


