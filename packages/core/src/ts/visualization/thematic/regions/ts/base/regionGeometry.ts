import { Cartesian3, PolygonHierarchy } from 'cesium'
import type { Position } from 'geojson'
import type { RegionFeature } from '../types'

export function regionPolygons(feature: RegionFeature): Position[][][] {
    if (feature.geometry?.type === 'Polygon') return [feature.geometry.coordinates]
    if (feature.geometry?.type === 'MultiPolygon') return feature.geometry.coordinates
    throw new RangeError('Region geometry must be Polygon or MultiPolygon.')
}

export function ringPositions(ring: Position[], height?: number): Cartesian3[] {
    if (ring.length < 3) throw new RangeError('Region rings need at least three vertices.')
    const points = ring.map(point => {
        if (point.length < 2 || ![point[0], point[1], point[2] ?? 0].every(Number.isFinite) || Math.abs(point[1]) > 90) throw new RangeError('Invalid region coordinate.')
        return Cartesian3.fromDegrees(point[0], point[1], height ?? point[2] ?? 0)
    })
    if (!Cartesian3.equals(points[0], points[points.length - 1])) points.push(Cartesian3.clone(points[0]))
    return points
}

export function polygonHierarchy(rings: Position[][], height?: number): PolygonHierarchy {
    if (!rings.length) throw new RangeError('A region polygon requires an outer ring.')
    return new PolygonHierarchy(ringPositions(rings[0], height), rings.slice(1).map(ring => new PolygonHierarchy(ringPositions(ring, height))))
}
